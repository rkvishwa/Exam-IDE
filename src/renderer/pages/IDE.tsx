import React, { useState, useEffect, useCallback, useRef } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useAuth } from "../context/AuthContext";
import {
  CollaborationProvider,
  useCollaboration,
  WorkspaceFile,
  WorkspaceMetadata,
  FileOperation,
} from "../context/CollaborationContext";
import FileTree from "../components/FileTree/FileTree";
import EditorPanel from "../components/Editor/EditorPanel";
import PreviewPanel from "../components/Preview/PreviewPanel";
import ActivityBar from "../components/Sidebar/ActivityBar";
import SettingsModal from "../components/Settings/SettingsModal";
import CollaborationModal from "../components/Collaboration/CollaborationModal";
import { useMonitoring } from "../hooks/useMonitoring";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useActivityLogger } from "../hooks/useActivityLogger";
import "./IDE.css";

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
  type?: "file" | "preview" | "image";
  isPreviewFile?: boolean;
  isDeleted?: boolean;
}

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "svg",
  "webp",
  "ico",
]);

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.has(ext);
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  sh: "shell",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  sql: "sql",
  php: "php",
};

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_MAP[ext] || "plaintext";
}

/**
 * Collapse repeated slashes and strip trailing slash for stable comparison.
 */
function normalizePath(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
}

/**
 * Convert an absolute path to a relative path against a workspace root.
 * Handles Windows/Mac path separator differences and case-insensitive
 * drive letters for cross-platform collaboration sync.
 */
function toRelativePath(fullPath: string, wsRoot: string): string {
  const normFull = normalizePath(fullPath);
  const normRoot = normalizePath(wsRoot);

  // Case-insensitive startsWith for Windows drive letter compatibility (D: vs d:)
  if (normFull.toLowerCase().startsWith(normRoot.toLowerCase())) {
    let rel = normFull.slice(normRoot.length);
    if (rel.startsWith("/")) rel = rel.slice(1);
    return rel;
  }

  // Second attempt: compare just the last N segments (handles different mount
  // points for the same logical folder, e.g. host has D:/proj, client has
  // /Users/mac/proj).  Extract a common suffix of path segments.
  const fullSegs = normFull.split("/");
  const rootSegs = normRoot.split("/");
  // Find how many trailing segments of normRoot match the corresponding segments
  // in normFull (case-insensitive for cross-platform safety).
  let matchCount = 0;
  for (
    let i = rootSegs.length - 1, j = fullSegs.length - 1;
    i >= 0 && j >= 0;
    i--, j--
  ) {
    if (rootSegs[i].toLowerCase() !== fullSegs[j].toLowerCase()) break;
    matchCount++;
  }
  if (matchCount > 0 && matchCount === rootSegs.length) {
    // The entire rootSegs matched a suffix of fullSegs – remaining segments
    // after that suffix are the relative path.
    const rel = fullSegs.slice(fullSegs.length - matchCount + rootSegs.length);
    if (rel.length > 0) return rel.join("/");
  }

  // Fallback: return the normalized full path (sanitizeRelPath on receiver will strip drive prefix)
  return normFull;
}

export default function IDE() {
  return (
    <CollaborationProvider>
      <IDEContent />
    </CollaborationProvider>
  );
}

function IDEContent() {
  const { user, logout } = useAuth();
  const isOnline = useNetworkStatus();
  const collaboration = useCollaboration();
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("ide-theme") || "system",
  );
  const [autoSave, setAutoSave] = useState(
    () => localStorage.getItem("ide-autosave") === "true",
  );
  const [hotReload, setHotReload] = useState(
    () => localStorage.getItem("ide-hotreload") !== "false",
  );
  const [wordWrap, setWordWrap] = useState(
    () => localStorage.getItem("ide-wordwrap") !== "false",
  );
  const [showCollabUsernames, setShowCollabUsernames] = useState(
    () => localStorage.getItem("ide-collab-usernames") !== "false",
  );
  const [collabUsernameOpacity, setCollabUsernameOpacity] = useState(() =>
    Number(localStorage.getItem("ide-collab-username-opacity") ?? 80),
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [newFileTrigger, setNewFileTrigger] = useState(0);
  const [fileTreeRefreshKey, setFileTreeRefreshKey] = useState(0);

  // Refs for stable file-operation subscriber (avoids re-subscription on every render)
  const fileOpQueueRef = useRef<Promise<void>>(Promise.resolve());
  const workspaceRootRef = useRef<string | null>(null);
  // Keep the ref in sync with state
  useEffect(() => {
    workspaceRootRef.current = workspaceRoot;
  }, [workspaceRoot]);

  // Stable refs for collaboration values so that file-tree callbacks don't
  // change identity on every render (the collaboration context object is new
  // each render due to awareness updates every ~2 s, which cascades into
  // FileTree re-renders and can steal input focus on Windows/Electron).
  const collabActiveRef = useRef(collaboration.isActive);
  const broadcastFileOpRef = useRef(collaboration.broadcastFileOp);
  const setFileContentRef = useRef(collaboration.setFileContent);
  useEffect(() => {
    collabActiveRef.current = collaboration.isActive;
    broadcastFileOpRef.current = collaboration.broadcastFileOp;
    setFileContentRef.current = collaboration.setFileContent;
  }, [collaboration.isActive, collaboration.broadcastFileOp, collaboration.setFileContent]);

  useEffect(() => {
    // Add platform class to body for OS-specific styling
    const platform = window.navigator.userAgent.toLowerCase();
    if (platform.includes("win")) {
      document.body.classList.add("platform-windows");
    } else {
      document.body.classList.add("platform-mac");
    }
  }, []);

  useEffect(() => {
    let activeTheme = theme;
    if (theme === "system") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => {
        if (theme === "system") {
          document.documentElement.setAttribute(
            "data-theme",
            e.matches ? "dark" : "light",
          );
        }
      };
      mediaQuery.addEventListener("change", listener);
      document.documentElement.setAttribute("data-theme", activeTheme);
      localStorage.setItem("ide-theme", theme);
      window.dispatchEvent(new Event("ide-theme-changed"));

      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("ide-theme", theme);
      window.dispatchEvent(new Event("ide-theme-changed"));
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("ide-autosave", String(autoSave));
  }, [autoSave]);

  useEffect(() => {
    localStorage.setItem("ide-collab-usernames", String(showCollabUsernames));
    window.dispatchEvent(new Event("collab-settings-changed"));
  }, [showCollabUsernames]);

  useEffect(() => {
    localStorage.setItem(
      "ide-collab-username-opacity",
      String(collabUsernameOpacity),
    );
    window.dispatchEvent(new Event("collab-settings-changed"));
  }, [collabUsernameOpacity]);

  useEffect(() => {
    localStorage.setItem("ide-hotreload", String(hotReload));
  }, [hotReload]);

  useEffect(() => {
    localStorage.setItem("ide-wordwrap", String(wordWrap));
  }, [wordWrap]);

  useEffect(() => {
    const dirtyTabs = tabs.filter(
      (t) => t.isDirty && t.type !== "preview" && t.type !== "image",
    );
    if (dirtyTabs.length === 0) return;

    const timer = setTimeout(async () => {
      let savedAny = false;
      for (const tab of dirtyTabs) {
        try {
          await window.electronAPI.fs.writeFile(tab.path, tab.content);
          if (autoSave) {
            setTabs((prev) =>
              prev.map((t) =>
                t.path === tab.path ? { ...t, isDirty: false, isDeleted: false } : t,
              ),
            );
          } else {
            setTabs((prev) =>
              prev.map((t) =>
                t.path === tab.path ? { ...t, isDeleted: false } : t,
              ),
            );
          }
          savedAny = true;
        } catch (err) {
          console.error("Failed to auto-save file for live preview:", err);
        }
      }
      if (savedAny && hotReload) {
        // Dispatch file-saved to trigger hot reload in preview panels once
        window.dispatchEvent(new CustomEvent("file-saved"));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [tabs, autoSave, hotReload]);

  // Guard ref: prevents multiple concurrent sync / folder-dialog opens.
  // Once a sync has started (or the user has picked / cancelled a folder),
  // subsequent metadata callbacks are ignored.
  const isSyncingRef = useRef(false);
  // Track the last synced folder name so we only prompt once per workspace.
  const lastSyncedFolderRef = useRef<string | null>(null);

  // Listen for shared workspace metadata from collaboration (for clients joining)
  useEffect(() => {
    if (!collaboration.isActive) return;
    if (collaboration.status?.mode === "host") return; // Host doesn't need to receive

    // Reset guards when the effect re-runs (e.g. new session)
    isSyncingRef.current = false;
    lastSyncedFolderRef.current = null;

    const unsubMetadata = collaboration.onWorkspaceMetadataChange(
      async (metadata: WorkspaceMetadata | null) => {
        if (!metadata) return;

        // Prevent opening the folder dialog multiple times
        if (isSyncingRef.current) return;
        if (lastSyncedFolderRef.current === metadata.folderName) {
          // Already synced this workspace — just re-sync files silently
        }

        console.log(
          "Received workspace metadata:",
          metadata.folderName,
          `(${metadata.files.length} files)`,
        );

        /**
         * Synchronise the local workspace so it mirrors the host exactly.
         * This handles three cases:
         *  a) folder already exists at hostPath  → sync in-place
         *  b) folder doesn't exist at hostPath   → ask user where to put it, then create+sync
         */
        const syncWorkspaceTo = async (targetPath: string) => {
          // Build a set of relative paths the host has (normalised to /)
          const hostRelPaths = new Set<string>();
          for (const file of metadata.files) {
            hostRelPaths.add(file.relativePath.replace(/\\/g, "/"));
          }

          // --- Create / overwrite files from host ---
          for (const file of metadata.files) {
            const normalizedRelPath = file.relativePath.replace(/\\/g, "/");
            const filePath = `${targetPath}/${normalizedRelPath}`;

            if (file.isDirectory) {
              try {
                await window.electronAPI.fs.createFolder(filePath);
              } catch {
                // Folder may already exist
              }
            } else {
              // Ensure parent directory exists
              const parentDir = filePath.substring(
                0,
                filePath.lastIndexOf("/"),
              );
              try {
                await window.electronAPI.fs.createFolder(parentDir);
              } catch {
                // Parent might already exist
              }
              await window.electronAPI.fs.writeFile(filePath, file.content);
            }
          }

          // --- Remove local files/folders that the host does NOT have ---
          // This prevents stale extra files from causing sync mismatches.
          const removeExtras = async (
            dirPath: string,
            relPrefix: string,
          ) => {
            let entries: { name: string; type: string }[];
            try {
              entries = await window.electronAPI.fs.readDirectory(dirPath);
            } catch {
              return;
            }
            for (const entry of entries) {
              if (
                entry.name.startsWith(".") ||
                entry.name === "node_modules" ||
                entry.name === "dist" ||
                entry.name === "build" ||
                entry.name === ".git"
              ) {
                continue;
              }
              const entryRel = relPrefix
                ? `${relPrefix}/${entry.name}`
                : entry.name;
              const entryFull = `${dirPath}/${entry.name}`;

              if (entry.type === "directory") {
                if (!hostRelPaths.has(entryRel)) {
                  // Host doesn't have this directory at all — delete it
                  try {
                    await window.electronAPI.fs.deleteItem(entryFull);
                  } catch {
                    // ignore
                  }
                } else {
                  // Recurse into sub-directory
                  await removeExtras(entryFull, entryRel);
                }
              } else {
                if (!hostRelPaths.has(entryRel)) {
                  try {
                    await window.electronAPI.fs.deleteItem(entryFull);
                  } catch {
                    // ignore
                  }
                }
              }
            }
          };

          await removeExtras(targetPath, "");
          console.log(
            `Synced workspace "${metadata.folderName}" — ${metadata.files.length} host files`,
          );
        };

        // Check if workspace already exists locally at same path
        let targetPath: string;
        try {
          await window.electronAPI.fs.readDirectory(metadata.hostPath);
          // Path exists — sync files in-place so local matches host exactly
          targetPath = metadata.hostPath;
        } catch {
          // Path doesn't exist — ask user where to save
          // Acquire the syncing lock so no other callback opens another dialog
          if (isSyncingRef.current) return;
          isSyncingRef.current = true;

          let selectedFolder;
          try {
            selectedFolder = await window.electronAPI.fs.openFolderDialog();
          } catch (dialogErr: any) {
            console.error("Folder dialog error:", dialogErr);
            window.electronAPI.dialog.showError(
              `Failed to open folder dialog: ${dialogErr.message || dialogErr}`
            );
            isSyncingRef.current = false;
            return;
          }

          if (!selectedFolder) {
            console.log("User cancelled workspace download");
            isSyncingRef.current = false;
            return;
          }
          targetPath = `${selectedFolder.path}/${metadata.folderName}`;
          try {
            await window.electronAPI.fs.createFolder(targetPath);
          } catch {
            // May already exist
          }
        }

        try {
          await syncWorkspaceTo(targetPath);
          // Normalize the workspace root so path comparisons in
          // toRelativePath never fail due to double-slashes or
          // mixed separators.
          setWorkspaceRoot(
            targetPath
              .replace(/\\/g, "/")
              .replace(/\/{2,}/g, "/")
              .replace(/\/+$/, ""),
          );
          lastSyncedFolderRef.current = metadata.folderName;
        } catch (err) {
          console.error("Failed to sync workspace:", err);
          window.electronAPI.dialog.showError(
            `Failed to sync workspace: ${err}`,
          );
        } finally {
          isSyncingRef.current = false;
        }
      },
    );

    return () => {
      unsubMetadata();
    };
  }, [
    collaboration.isActive,
    collaboration.status?.mode,
    collaboration.onWorkspaceMetadataChange,
  ]);

  // Save collaborative edits to local tabs before the session stops
  useEffect(() => {
    if (!collaboration.isActive || !collaboration.onBeforeSessionStop) return;
    
    const unsub = collaboration.onBeforeSessionStop(() => {
      setTabs((prev) =>
        prev.map((t) => {
          const collabContent = collaboration.getFileContent(
            t.path,
            workspaceRootRef.current ?? undefined,
          );
          if (collabContent !== null && collabContent !== t.content) {
            // Keep the latest edits so the file doesn't revert
            return { ...t, content: collabContent, isDirty: true };
          }
          return t;
        }),
      );
    });
    
    return unsub;
  }, [collaboration.isActive, collaboration.onBeforeSessionStop, collaboration.getFileContent]);

  // Share workspace with files when host opens a folder
  useEffect(() => {
    if (!collaboration.isActive) return;
    if (collaboration.status?.mode !== "host") return;
    if (!workspaceRoot) return;

    // Scan and share all files in the workspace
    const scanAndShareWorkspace = async () => {
      console.log("Scanning workspace to share:", workspaceRoot);

      const files: WorkspaceFile[] = [];
      const scanDir = async (dirPath: string, relativePath: string = "") => {
        try {
          const entries = await window.electronAPI.fs.readDirectory(dirPath);

          for (const entry of entries) {
            // Skip hidden files and common ignored directories
            if (
              entry.name.startsWith(".") ||
              entry.name === "node_modules" ||
              entry.name === "dist" ||
              entry.name === "build" ||
              entry.name === ".git"
            ) {
              continue;
            }

            const entryRelativePath = relativePath
              ? `${relativePath}/${entry.name}`
              : entry.name;
            const fullPath = `${dirPath}/${entry.name}`;

            if (entry.type === "directory") {
              files.push({
                relativePath: entryRelativePath,
                content: "",
                isDirectory: true,
              });
              await scanDir(fullPath, entryRelativePath);
            } else {
              // Skip binary/large files and known non-text formats
              const ext = entry.name.split(".").pop()?.toLowerCase() || "";
              if (IMAGE_EXTENSIONS.has(ext)) continue;
              // Skip other common binary file extensions
              const BINARY_EXTENSIONS = new Set([
                'exe', 'dll', 'so', 'dylib', 'bin', 'dat',
                'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                'mp3', 'mp4', 'wav', 'ogg', 'avi', 'mkv', 'mov',
                'woff', 'woff2', 'ttf', 'otf', 'eot',
                'sqlite', 'db', 'lock',
                'class', 'pyc', 'pyo', 'o', 'obj',
              ]);
              if (BINARY_EXTENSIONS.has(ext)) continue;

              try {
                const content = await window.electronAPI.fs.readFile(fullPath);
                // Skip files larger than 1MB or files that appear to be binary
                // (readFile returns empty string for binary files)
                if (content.length > 1024 * 1024) continue;

                files.push({
                  relativePath: entryRelativePath,
                  content,
                  isDirectory: false,
                });
              } catch {
                // Skip unreadable files
              }
            }
          }
        } catch (err) {
          console.error("Error scanning directory:", dirPath, err);
        }
      };

      await scanDir(workspaceRoot);
      console.log(`Sharing workspace with ${files.length} files`);
      collaboration.shareWorkspaceWithFiles(workspaceRoot, files);
    };

    scanAndShareWorkspace();
  }, [
    collaboration.isActive,
    collaboration.status?.mode,
    workspaceRoot,
    collaboration.shareWorkspaceWithFiles,
  ]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) =>
      prev === "dark" ? "light" : prev === "light" ? "system" : "dark",
    );
  }, []);

  useMonitoring(user, isOnline, activeTabPath || "");
  useActivityLogger(!!user);

  const activeTab = tabs.find((t) => t.path === activeTabPath) || null;

  // Use a ref so openFile always sees the latest tabs without depending on
  // the `tabs` array — this keeps the callback identity stable which in turn
  // keeps FileTree (wrapped in React.memo) from re-rendering on every tab
  // change, preventing focus loss in inline-create inputs.
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const openFile = useCallback(
    async (filePath: string, fileName: string) => {
      const existing = tabsRef.current.find((t) => t.path === filePath);
      if (existing) {
        setActiveTabPath(filePath);
        return;
      }
      try {
        let tab: OpenTab;
        if (isImageFile(fileName)) {
          const imageUrl = `local-file://image?path=${encodeURIComponent(filePath)}`;
          tab = {
            path: filePath,
            name: fileName,
            content: imageUrl,
            isDirty: false,
            language: "",
            type: "image",
            isPreviewFile: true,
          };
        } else {
          // Read from local filesystem
          const content = await window.electronAPI.fs.readFile(filePath);

          tab = {
            path: filePath,
            name: fileName,
            content,
            isDirty: false,
            language: getLanguage(fileName),
            isPreviewFile: true,
          };
        }
        setTabs((prev) => {
          const next = prev.filter((t) => !t.isPreviewFile || t.isDirty);
          return [...next, tab];
        });
        setActiveTabPath(filePath);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [],
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        const next = prev.filter((t) => t.path !== path);
        if (activeTabPath === path) {
          const newActive = next[Math.min(idx, next.length - 1)]?.path || null;
          setActiveTabPath(newActive);
        }
        return next;
      });
    },
    [activeTabPath],
  );

  const saveFile = useCallback(async () => {
    if (!activeTab) return;
    try {
      // During collaboration, get content from editor model (not React state)
      // since React state isn't updated during collaborative editing
      const content = collaboration.isActive
        ? (collaboration.getCurrentEditorContent() ?? activeTab.content)
        : activeTab.content;

      await window.electronAPI.fs.writeFile(activeTab.path, content);
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTab.path
            ? { ...t, content, isDirty: false, isPreviewFile: false, isDeleted: false }
            : t,
        ),
      );
      if (hotReload) {
        window.dispatchEvent(new CustomEvent("file-saved"));
      }
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [activeTab, hotReload, collaboration]);

  const updateContent = useCallback((path: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === path
          ? { ...t, content, isDirty: true, isPreviewFile: false }
          : t,
      ),
    );
  }, []);

  const pinTab = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.path === path ? { ...t, isPreviewFile: false } : t)),
    );
  }, []);

  // Provide the latest collaborative content for a file.
  // Used by EditorPanel to show up-to-date content when switching tabs,
  // since React state tab.content is not updated during collaboration.
  const getCollaborativeContent = useCallback(
    (filePath: string): string | null => {
      if (!collaboration.isActive) return null;
      return collaboration.getFileContent(filePath, workspaceRoot ?? undefined);
    },
    [collaboration.isActive, collaboration.getFileContent, workspaceRoot],
  );

  const handleFileDeleted = useCallback(
    (deletedPath: string, type: "file" | "directory") => {
      setTabs((prev) => {
        const next = prev.map((t) => {
          const tNorm = t.path.replace(/\\/g, "/").toLowerCase();
          const dNorm = deletedPath.replace(/\\/g, "/").toLowerCase();
          
          if (type === "directory") {
            if (tNorm === dNorm || tNorm.startsWith(dNorm + "/")) {
              return { ...t, isDeleted: true };
            }
          } else if (tNorm === dNorm) {
            return { ...t, isDeleted: true };
          }
          return t;
        });
        return next;
      });

      // Broadcast delete to collaboration peers
      try {
        const wsRoot = workspaceRootRef.current;
        if (collabActiveRef.current && wsRoot) {
          const relativePath = toRelativePath(deletedPath, wsRoot);
          broadcastFileOpRef.current({
            type: "delete",
            relativePath,
            isDirectory: type === "directory",
          });
        }
      } catch (err) {
        console.error('broadcastFileOp delete failed:', err);
      }
    },
    [],
  );

  const handleFileRenamed = useCallback(
    (oldPath: string, newPath: string) => {
      setTabs((prev) => {
        let updated = false;
        const next = prev.map((t) => {
          const tNorm = t.path.replace(/\\/g, "/").toLowerCase();
          const oNorm = oldPath.replace(/\\/g, "/").toLowerCase();
          
          if (tNorm === oNorm || tNorm.startsWith(oNorm + "/")) {
            updated = true;
            const newFilePath = newPath + t.path.slice(oldPath.length);
            const newName = newFilePath.split(/[\\/]/).pop() || "";
            return { ...t, path: newFilePath, name: newName };
          }
          return t;
        });

        if (updated) {
          setActiveTabPath((current) => {
            if (!current) return null;
            const cNorm = current.replace(/\\/g, "/").toLowerCase();
            const oNorm = oldPath.replace(/\\/g, "/").toLowerCase();
            if (cNorm === oNorm || cNorm.startsWith(oNorm + "/")) {
              return newPath + current.slice(oldPath.length);
            }
            return current;
          });
        }
        return next;
      });

      // Broadcast rename to collaboration peers
      try {
        const wsRoot = workspaceRootRef.current;
        if (collabActiveRef.current && wsRoot) {
          const relOld = toRelativePath(oldPath, wsRoot);
          const relNew = toRelativePath(newPath, wsRoot);
          broadcastFileOpRef.current({
            type: "rename",
            relativePath: relOld,
            newRelativePath: relNew,
          });
        }
      } catch (err) {
        console.error('broadcastFileOp rename failed:', err);
      }
    },
    [],
  );

  const handleFileCreated = useCallback(
    async (fullPath: string, _name: string) => {
      try {
        const wsRoot = workspaceRootRef.current;
        if (collabActiveRef.current && wsRoot) {
          let content = "";
          // Read file content FIRST (before setting tab state) so that
          // setFileContent updates Y.Text before the EditorPanel rebind
          // effect fires (which is triggered by isDeleted going false).
          try {
            content = await window.electronAPI.fs.readFile(fullPath);
          } catch (readErr) {
            console.warn(`Could not read file for broadcast: ${fullPath}`, readErr);
          }

          // Reinitialize the Yjs Y.Text BEFORE marking the tab as
          // not-deleted, so the rebind triggered by EditorPanel sees
          // up-to-date collaborative content.
          setFileContentRef.current(fullPath, content, wsRoot);

          const relativePath = toRelativePath(fullPath, wsRoot);
          broadcastFileOpRef.current({
            type: "create-file",
            relativePath,
            content,
          });
        }
      } catch (err) {
        console.error('broadcastFileOp create-file failed:', err);
      }

      // Mark the tab as not-deleted AFTER seeding Y.Text, so the
      // EditorPanel rebind effect fires with correct collaborative state.
      setTabs((prev) =>
        prev.map((t) => {
          const tNorm = t.path.replace(/\\/g, "/").toLowerCase();
          const fNorm = fullPath.replace(/\\/g, "/").toLowerCase();
          return tNorm === fNorm ? { ...t, isDeleted: false } : t;
        })
      );
    },
    [],
  );

  const handleFolderCreated = useCallback(
    (fullPath: string) => {
      try {
        const wsRoot = workspaceRootRef.current;
        if (collabActiveRef.current && wsRoot) {
          const relativePath = toRelativePath(fullPath, wsRoot);
          broadcastFileOpRef.current({
            type: "create-folder",
            relativePath,
          });
        }
      } catch (err) {
        console.error('broadcastFileOp create-folder failed:', err);
      }
    },
    [],
  );

  // Subscribe to file operations from collaboration peers.
  // Uses a STABLE subscription (deps: isActive + onFileOperation) to avoid
  // constant unsubscribe/resubscribe on every render, which could create
  // micro-gaps where incoming ops are lost.
  // The workspaceRoot is read via a ref so the callback always has the latest
  // value without needing to be in the dependency array.
  useEffect(() => {
    if (!collaboration.isActive) return;

    // Strip absolute path prefixes and backslashes from incoming relative paths
    const sanitizeRelPath = (p: string) =>
      p
        .replace(/\\/g, "/")
        .replace(/\/{2,}/g, "/")
        .replace(/^[A-Za-z]:[\/]/, "")
        .replace(/^\/+/, "");

    const unsub = collaboration.onFileOperation((op: FileOperation) => {
      // Chain operations sequentially.  CRITICAL: `.catch()` at the end
      // ensures a failed operation never breaks the promise chain — without
      // this, one rejected promise would cause ALL subsequent operations to
      // hang forever (the queue would stay in a rejected state).
      fileOpQueueRef.current = fileOpQueueRef.current.then(async () => {
        const wsRoot = workspaceRootRef.current;
        if (!wsRoot) {
          console.warn("Skipping remote file op — no workspace root yet");
          return;
        }
        // Normalize workspace root to forward slashes for cross-platform path construction
        const normRoot = wsRoot.replace(/\\/g, "/");
        const relPath = sanitizeRelPath(op.relativePath);
        const fullPath = `${normRoot}/${relPath}`;
        console.log(
          `Applying remote file op: ${op.type} ${relPath}`,
          op.newRelativePath ? `→ ${op.newRelativePath}` : "",
        );
        try {
          switch (op.type) {
            case "create-file":
              try {
                await window.electronAPI.fs.createFile(fullPath);
                if (op.content) {
                  await window.electronAPI.fs.writeFile(fullPath, op.content);
                }
              } catch (createErr) {
                console.warn(`Remote create-file failed: ${relPath}`, createErr);
              }
              // Seed the Yjs Y.Text for the recreated file so that
              // collaboration sync resumes immediately instead of
              // the remote peer seeing a stale/empty document.
              if (op.content != null) {
                setFileContentRef.current(fullPath, op.content, wsRoot);
              }
              setTabs((prev) =>
                prev.map((t) => {
                  const tNorm = t.path.replace(/\\/g, "/").toLowerCase();
                  const fNorm = fullPath.replace(/\\/g, "/").toLowerCase();
                  if (tNorm === fNorm) {
                    return { ...t, isDeleted: false, content: op.content || t.content };
                  }
                  return t;
                })
              );
              break;
            case "create-folder":
              try {
                await window.electronAPI.fs.createFolder(fullPath);
              } catch (folderErr) {
                console.warn(`Remote create-folder failed: ${relPath}`, folderErr);
              }
              break;
            case "delete":
              try {
                await window.electronAPI.fs.deleteItem(fullPath);
              } catch {
                // File may already be gone (e.g. after a failed rename); treat as success
              }
              // Update tabs locally WITHOUT calling handleFileDeleted (which would
              // re-broadcast the op and create an infinite echo loop)
              setTabs((prev) => {
                const next = prev.map((t) => {
                  const tNorm = t.path.replace(/\\/g, "/").toLowerCase();
                  const fNorm = fullPath.replace(/\\/g, "/").toLowerCase();
                  if (op.isDirectory) {
                    if (
                      tNorm.startsWith(fNorm + "/") ||
                      tNorm === fNorm
                    ) {
                      return { ...t, isDeleted: true };
                    }
                  } else if (tNorm === fNorm) {
                    return { ...t, isDeleted: true };
                  }
                  return t;
                });
                return next;
              });
              break;
            case "rename": {
              const newRelPath = sanitizeRelPath(op.newRelativePath || "");
              const newFullPath = `${normRoot}/${newRelPath}`;
              try {
                await window.electronAPI.fs.renameItem(fullPath, newFullPath);
              } catch (renameErr) {
                console.warn(
                  `Remote rename failed (${relPath} → ${newRelPath}):`,
                  renameErr,
                );
              }
              // Update tabs locally WITHOUT calling handleFileRenamed (which would
              // re-broadcast the op and create an infinite echo loop)
              setTabs((prev) => {
                let updated = false;
                const next = prev.map((t) => {
                  const tNorm = t.path.replace(/\\/g, "/").toLowerCase();
                  const fNorm = fullPath.replace(/\\/g, "/").toLowerCase();
                  if (
                    tNorm === fNorm ||
                    tNorm.startsWith(fNorm + "/")
                  ) {
                    updated = true;
                    const newFilePath =
                      newFullPath + t.path.slice(fullPath.length);
                    const newName =
                      newFilePath.split(/[\\/]/).pop() || "";
                    return { ...t, path: newFilePath, name: newName };
                  }
                  return t;
                });
                if (updated) {
                  setActiveTabPath((current) => {
                    if (!current) return null;
                    const cNorm = current.replace(/\\/g, "/").toLowerCase();
                    const fNorm = fullPath.replace(/\\/g, "/").toLowerCase();
                    if (
                      cNorm === fNorm ||
                      cNorm.startsWith(fNorm + "/")
                    ) {
                      return newFullPath + current.slice(fullPath.length);
                    }
                    return current;
                  });
                }
                return next;
              });
              break;
            }
          }
          // Always trigger a refresh of the file tree so the user sees remote changes immediately
          setFileTreeRefreshKey((prev) => prev + 1);
        } catch (err) {
          console.error("Failed to apply remote file operation:", op.type, err);
        }
      }).catch((err) => {
        // Safety net: if anything escapes the inner try/catch, recover the
        // queue so future operations aren't permanently blocked.
        console.error("File operation queue error (recovered):", err);
      });
    });

    return unsub;
  }, [collaboration.isActive, collaboration.onFileOperation]);

  const openFolder = useCallback(async () => {
    const result = await window.electronAPI.fs.openFolderDialog();
    if (result) {
      setTabs([]);
      setActiveTabPath(null);
      setWorkspaceRoot(normalizePath(result.path));
    }
  }, []);

  const [previewInitialUrl, setPreviewInitialUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setPreviewInitialUrl(null);
  }, [workspaceRoot]);

  const openPreviewInTab = useCallback(
    (urlFromPanel?: string) => {
      const previewPath = "__preview__";
      if (urlFromPanel) {
        setPreviewInitialUrl(urlFromPanel);
      }
      const existing = tabs.find((t) => t.path === previewPath);
      if (existing) {
        setActiveTabPath(previewPath);
        return;
      }
      const tab: OpenTab = {
        path: previewPath,
        name: "Preview",
        content: "",
        isDirty: false,
        language: "",
        type: "preview",
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabPath(previewPath);
    },
    [tabs],
  );

  const openPreviewInTabToggle = useCallback(() => {
    const previewPath = "__preview__";
    const isTabOpen = tabs.some((t) => t.path === previewPath);
    if (isTabOpen) {
      closeTab(previewPath);
    } else {
      openPreviewInTab();
    }
  }, [tabs, closeTab, openPreviewInTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setNewFileTrigger((v) => v + 1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (activeTabPath) closeTab(activeTabPath);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setShowExplorer((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        setShowPreview((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "B") {
        e.preventDefault();
        openPreviewInTabToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveFile, closeTab, activeTabPath, openPreviewInTabToggle]);

  return (
    <div className="ide-container">
      <div className="traffic-light-bg" />
      <ActivityBar
        teamName={user?.teamName || ""}
        isOnline={isOnline}
        onOpenFolder={openFolder}
        showPreviewRightPanel={showPreview}
        onTogglePreviewRightPanel={() => setShowPreview((v) => !v)}
        isPreviewInTab={tabs.some((t) => t.path === "__preview__")}
        onTogglePreviewTab={openPreviewInTabToggle}
        onToggleExplorer={() => setShowExplorer((v) => !v)}
        showExplorer={showExplorer}
        onLogout={logout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isCollaborating={collaboration.isActive}
        onToggleCollaboration={() => setIsCollaborationOpen(true)}
      />
      <div className="ide-body">
        <PanelGroup direction="horizontal" autoSaveId="ide-layout">
          {showExplorer && (
            <>
              <Panel
                id="explorer"
                order={1}
                defaultSize={20}
                minSize={15}
                maxSize={40}
              >
                <FileTree
                  workspaceRoot={workspaceRoot}
                  onOpenFolder={openFolder}
                  onFileClick={openFile}
                  activeFilePath={activeTabPath}
                  autoSave={autoSave}
                  onAutoSaveChange={setAutoSave}
                  onFileOpened={openFile}
                  newFileTrigger={newFileTrigger}
                  onFileDeleted={handleFileDeleted}
                  onFileRenamed={handleFileRenamed}
                  onFileCreated={handleFileCreated}
                  onFolderCreated={handleFolderCreated}
                  refreshTrigger={fileTreeRefreshKey}
                />
              </Panel>
              <PanelResizeHandle className="resize-handle" />
            </>
          )}
          <Panel
            id="editor"
            order={2}
            defaultSize={showPreview ? 60 : 80}
            minSize={30}
          >
            <EditorPanel
              tabs={tabs}
              activeTabPath={activeTabPath}
              onTabClick={setActiveTabPath}
              onTabDoubleClick={pinTab}
              onTabClose={closeTab}
              onContentChange={updateContent}
              onSave={saveFile}
              onReorderTabs={(fromIndex, toIndex) => {
                setTabs((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(fromIndex, 1);
                  next.splice(toIndex, 0, moved);
                  return next;
                });
              }}
              workspaceRoot={workspaceRoot}
              onOpenFolder={openFolder}
              theme={theme}
              activeFilePath={activeTabPath}
              previewInitialUrl={previewInitialUrl}
              collaborationActive={collaboration.isActive}
              onEditorMount={collaboration.bindEditor}
              onEditorUnmount={collaboration.unbindEditor}
              wordWrap={wordWrap}
              getCollaborativeContent={getCollaborativeContent}
            />
          </Panel>
          {showPreview && (
            <>
              <PanelResizeHandle className="resize-handle" />
              <Panel id="preview" order={3} defaultSize={20} minSize={15}>
                <PreviewPanel
                  key={workspaceRoot || 'empty'}
                  workspaceRoot={workspaceRoot}
                  activeFilePath={activeTabPath}
                  onOpenInTab={openPreviewInTab}
                  onClose={() => setShowPreview(false)}
                  initialUrl={previewInitialUrl}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        autoSave={autoSave}
        onAutoSaveChange={setAutoSave}
        hotReload={hotReload}
        onHotReloadChange={setHotReload}
        theme={theme}
        onThemeChange={setTheme}
        wordWrap={wordWrap}
        onWordWrapChange={setWordWrap}
        showCollabUsernames={showCollabUsernames}
        onShowCollabUsernamesChange={setShowCollabUsernames}
        collabUsernameOpacity={collabUsernameOpacity}
        onCollabUsernameOpacityChange={setCollabUsernameOpacity}
        teamName={user?.teamName || ""}
        user={user}
        onLogout={logout}
      />
      <CollaborationModal
        isOpen={isCollaborationOpen}
        onClose={() => setIsCollaborationOpen(false)}
      />
    </div>
  );
}
