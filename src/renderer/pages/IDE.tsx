import React, { useState, useEffect, useCallback } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useAuth } from "../context/AuthContext";
import {
  CollaborationProvider,
  useCollaboration,
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [newFileTrigger, setNewFileTrigger] = useState(0);

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
    localStorage.setItem("ide-hotreload", String(hotReload));
  }, [hotReload]);

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
      await window.electronAPI.fs.writeFile(activeTab.path, activeTab.content);
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTab.path
            ? { ...t, isDirty: false, isPreviewFile: false }
            : t,
        ),
      );
      if (hotReload) {
        window.dispatchEvent(new CustomEvent("file-saved"));
      }
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [activeTab, hotReload]);

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
    },
    [],
  );

  const handleFileRenamed = useCallback((oldPath: string, newPath: string) => {
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
  }, []);

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
