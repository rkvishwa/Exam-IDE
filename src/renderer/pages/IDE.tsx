import React, { useState, useEffect, useCallback } from "react";
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

      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("ide-theme", theme);
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
                t.path === tab.path ? { ...t, isDirty: false } : t,
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

  // Listen for shared workspace metadata from collaboration (for clients joining)
  useEffect(() => {
    if (!collaboration.isActive) return;
    if (collaboration.status?.mode === "host") return; // Host doesn't need to receive

    const unsubMetadata = collaboration.onWorkspaceMetadataChange(
      async (metadata: WorkspaceMetadata | null) => {
        if (!metadata) return;

        console.log(
          "Received workspace metadata:",
          metadata.folderName,
          `(${metadata.files.length} files)`,
        );

        // Check if workspace already exists locally at same path
        try {
          await window.electronAPI.fs.readDirectory(metadata.hostPath);
          // Path exists, just use it
          setWorkspaceRoot(metadata.hostPath);
          console.log("Using existing workspace at:", metadata.hostPath);
          return;
        } catch {
          // Path doesn't exist, need to create it
        }

        // Ask user where to save the workspace
        const selectedFolder = await window.electronAPI.fs.openFolderDialog();
        if (!selectedFolder) {
          console.log("User cancelled workspace download");
          return;
        }

        // Create the workspace folder
        const targetPath = `${selectedFolder.path}/${metadata.folderName}`;
        console.log("Creating workspace at:", targetPath);

        try {
          await window.electronAPI.fs.createFolder(targetPath);

          // Create all files and folders
          for (const file of metadata.files) {
            const filePath = `${targetPath}/${file.relativePath}`;

            if (file.isDirectory) {
              await window.electronAPI.fs.createFolder(filePath);
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

          console.log(`Created workspace with ${metadata.files.length} files`);
          setWorkspaceRoot(targetPath);
        } catch (err) {
          console.error("Failed to create workspace:", err);
          window.electronAPI.dialog.showError(
            `Failed to create workspace: ${err}`,
          );
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
              // Skip binary/large files
              const ext = entry.name.split(".").pop()?.toLowerCase() || "";
              if (IMAGE_EXTENSIONS.has(ext)) continue;

              try {
                const content = await window.electronAPI.fs.readFile(fullPath);
                // Skip files larger than 1MB
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

  const openFile = useCallback(
    async (filePath: string, fileName: string) => {
      const existing = tabs.find((t) => t.path === filePath);
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
    [tabs],
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
            ? { ...t, content, isDirty: false, isPreviewFile: false }
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

  const handleFileDeleted = useCallback(
    (deletedPath: string, type: "file" | "directory") => {
      setTabs((prev) => {
        const next = prev.filter((t) => {
          if (type === "directory") {
            return (
              !t.path.startsWith(deletedPath + "/") &&
              !t.path.startsWith(deletedPath + "\\") &&
              t.path !== deletedPath
            );
          }
          return t.path !== deletedPath;
        });
        if (next.length < prev.length) {
          setActiveTabPath((current) => {
            if (!current) return null;
            const stillOpen = next.find((t) => t.path === current);
            if (stillOpen) return current;
            return next[next.length - 1]?.path || null;
          });
        }
        return next;
      });

      // Broadcast delete to collaboration peers
      if (collaboration.isActive && workspaceRoot) {
        const normRoot = workspaceRoot.replace(/\\/g, "/");
        const normDeleted = deletedPath.replace(/\\/g, "/");
        const relativePath = normDeleted.startsWith(normRoot)
          ? normDeleted.slice(normRoot.length + 1)
          : normDeleted;
        collaboration.broadcastFileOp({
          type: "delete",
          relativePath,
          isDirectory: type === "directory",
        });
      }
    },
    [collaboration, workspaceRoot],
  );

  const handleFileRenamed = useCallback(
    (oldPath: string, newPath: string) => {
      setTabs((prev) => {
        let updated = false;
        const next = prev.map((t) => {
          // If it was a directory renamed, we should update paths inside it
          if (
            t.path === oldPath ||
            t.path.startsWith(oldPath + "/") ||
            t.path.startsWith(oldPath + "\\")
          ) {
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
            if (
              current === oldPath ||
              current.startsWith(oldPath + "/") ||
              current.startsWith(oldPath + "\\")
            ) {
              return newPath + current.slice(oldPath.length);
            }
            return current;
          });
        }
        return next;
      });

      // Broadcast rename to collaboration peers
      if (collaboration.isActive && workspaceRoot) {
        const normRoot = workspaceRoot.replace(/\\/g, "/");
        const normOld = oldPath.replace(/\\/g, "/");
        const normNew = newPath.replace(/\\/g, "/");
        const relOld = normOld.startsWith(normRoot)
          ? normOld.slice(normRoot.length + 1)
          : normOld;
        const relNew = normNew.startsWith(normRoot)
          ? normNew.slice(normRoot.length + 1)
          : normNew;
        collaboration.broadcastFileOp({
          type: "rename",
          relativePath: relOld,
          newRelativePath: relNew,
        });
      }
    },
    [collaboration, workspaceRoot],
  );

  const handleFileCreated = useCallback(
    (fullPath: string, name: string) => {
      if (collaboration.isActive && workspaceRoot) {
        const normRoot = workspaceRoot.replace(/\\/g, "/");
        const normFull = fullPath.replace(/\\/g, "/");
        const relativePath = normFull.startsWith(normRoot)
          ? normFull.slice(normRoot.length + 1)
          : normFull;
        collaboration.broadcastFileOp({
          type: "create-file",
          relativePath,
          content: "",
        });
      }
    },
    [collaboration, workspaceRoot],
  );

  const handleFolderCreated = useCallback(
    (fullPath: string) => {
      if (collaboration.isActive && workspaceRoot) {
        const normRoot = workspaceRoot.replace(/\\/g, "/");
        const normFull = fullPath.replace(/\\/g, "/");
        const relativePath = normFull.startsWith(normRoot)
          ? normFull.slice(normRoot.length + 1)
          : normFull;
        collaboration.broadcastFileOp({
          type: "create-folder",
          relativePath,
        });
      }
    },
    [collaboration, workspaceRoot],
  );

  // Subscribe to file operations from collaboration peers
  useEffect(() => {
    if (!collaboration.isActive || !workspaceRoot) return;

    // Strip absolute path prefixes and backslashes from incoming relative paths
    const sanitizeRelPath = (p: string) =>
      p
        .replace(/\\/g, "/")
        .replace(/^[A-Za-z]:[\/]/, "")
        .replace(/^\/+/, "");

    const unsub = collaboration.onFileOperation(async (op: FileOperation) => {
      const relPath = sanitizeRelPath(op.relativePath);
      const fullPath = `${workspaceRoot}/${relPath}`;
      try {
        switch (op.type) {
          case "create-file":
            await window.electronAPI.fs.createFile(fullPath);
            if (op.content) {
              await window.electronAPI.fs.writeFile(fullPath, op.content);
            }
            break;
          case "create-folder":
            await window.electronAPI.fs.createFolder(fullPath);
            break;
          case "delete":
            try {
              await window.electronAPI.fs.deleteItem(fullPath);
            } catch {
              // File may already be gone (e.g. after a failed rename); treat as success
            }
            handleFileDeleted(fullPath, op.isDirectory ? "directory" : "file");
            break;
          case "rename": {
            const newRelPath = sanitizeRelPath(op.newRelativePath || "");
            const newFullPath = `${workspaceRoot}/${newRelPath}`;
            await window.electronAPI.fs.renameItem(fullPath, newFullPath);
            handleFileRenamed(fullPath, newFullPath);
            break;
          }
        }
        setFileTreeRefreshKey((k) => k + 1);
      } catch (err) {
        console.error("Failed to apply remote file operation:", op.type, err);
      }
    });

    return unsub;
  }, [collaboration, workspaceRoot, handleFileDeleted, handleFileRenamed]);

  const openFolder = useCallback(async () => {
    const result = await window.electronAPI.fs.openFolderDialog();
    if (result) {
      setTabs([]);
      setActiveTabPath(null);
      setWorkspaceRoot(result.path);
    }
  }, []);

  const [previewInitialUrl, setPreviewInitialUrl] = useState<string | null>(
    null,
  );

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
            />
          </Panel>
          {showPreview && (
            <>
              <PanelResizeHandle className="resize-handle" />
              <Panel id="preview" order={3} defaultSize={20} minSize={15}>
                <PreviewPanel
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
