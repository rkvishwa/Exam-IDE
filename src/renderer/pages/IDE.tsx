import React, { useState, useEffect, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useAuth } from '../context/AuthContext';
import FileTree from '../components/FileTree/FileTree';
import EditorPanel from '../components/Editor/EditorPanel';
import PreviewPanel from '../components/Preview/PreviewPanel';
import ActivityBar from '../components/Sidebar/ActivityBar';
import { useMonitoring } from '../hooks/useMonitoring';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import './IDE.css';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
  type?: 'file' | 'preview' | 'image';
  isPreviewFile?: boolean;
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico']);

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  html: 'html', css: 'css', json: 'json', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', java: 'java', c: 'c', cpp: 'cpp',
  sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql',
};

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
}

export default function IDE() {
  const { user, logout } = useAuth();
  const isOnline = useNetworkStatus();
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('ide-theme') || 'dark');
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('ide-autosave') === 'true');
  const [newFileTrigger, setNewFileTrigger] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ide-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ide-autosave', String(autoSave));
  }, [autoSave]);

  useEffect(() => {
    if (!autoSave) return;
    const dirtyTabs = tabs.filter(t => t.isDirty && t.type !== 'preview' && t.type !== 'image');
    if (dirtyTabs.length === 0) return;

    const timer = setTimeout(() => {
      dirtyTabs.forEach(async (tab) => {
        try {
          await window.electronAPI.fs.writeFile(tab.path, tab.content);
          setTabs((prev) => prev.map((t) =>
            t.path === tab.path ? { ...t, isDirty: false } : t
          ));
        } catch (err) {
          console.error('Failed to auto-save file:', err);
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [tabs, autoSave]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  useMonitoring(user, isOnline, activeTabPath || '');

  const activeTab = tabs.find((t) => t.path === activeTabPath) || null;

  const openFile = useCallback(async (filePath: string, fileName: string) => {
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
          language: '',
          type: 'image',
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
        const next = prev.filter(t => !t.isPreviewFile || t.isDirty);
        return [...next, tab];
      });
      setActiveTabPath(filePath);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [tabs]);

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      if (activeTabPath === path) {
        const newActive = next[Math.min(idx, next.length - 1)]?.path || null;
        setActiveTabPath(newActive);
      }
      return next;
    });
  }, [activeTabPath]);

  const saveFile = useCallback(async () => {
    if (!activeTab) return;
    try {
      await window.electronAPI.fs.writeFile(activeTab.path, activeTab.content);
      setTabs((prev) => prev.map((t) =>
        t.path === activeTab.path ? { ...t, isDirty: false } : t
      ));
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [activeTab]);

  const updateContent = useCallback((path: string, content: string) => {
    setTabs((prev) => prev.map((t) =>
      t.path === path ? { ...t, content, isDirty: true, isPreviewFile: false } : t
    ));
  }, []);

  const pinTab = useCallback((path: string) => {
    setTabs((prev) => prev.map((t) =>
      t.path === path ? { ...t, isPreviewFile: false } : t
    ));
  }, []);

  const openFolder = useCallback(async () => {
    const result = await window.electronAPI.fs.openFolderDialog();
    if (result) {
      setWorkspaceRoot(result.path);
    }
  }, []);

  const openPreviewInTab = useCallback(() => {
    const previewPath = '__preview__';
    const existing = tabs.find((t) => t.path === previewPath);
    if (existing) {
      setActiveTabPath(previewPath);
      return;
    }
    const tab: OpenTab = {
      path: previewPath,
      name: 'Preview',
      content: '',
      isDirty: false,
      language: '',
      type: 'preview',
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabPath(previewPath);
  }, [tabs]);

  const openPreviewInTabToggle = useCallback(() => {
    const previewPath = '__preview__';
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setNewFileTrigger((v) => v + 1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabPath) closeTab(activeTabPath);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowExplorer((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile, closeTab, activeTabPath]);

  return (
    <div className="ide-container">
      <div className="traffic-light-bg" />
      <ActivityBar
        teamName={user?.teamName || ''}
        isOnline={isOnline}
        onOpenFolder={openFolder}
        onSave={saveFile}
        showPreviewRightPanel={showPreview}
        onTogglePreviewRightPanel={() => setShowPreview((v) => !v)}
        isPreviewInTab={tabs.some((t) => t.path === '__preview__')}
        onTogglePreviewTab={openPreviewInTabToggle}
        onToggleExplorer={() => setShowExplorer((v) => !v)}
        showExplorer={showExplorer}
        onLogout={logout}
        isDirty={activeTab?.isDirty || false}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="ide-body">
        <PanelGroup direction="horizontal" autoSaveId="ide-layout">
          {showExplorer && (
            <>
              <Panel id="explorer" order={1} defaultSize={20} minSize={15} maxSize={40}>
                <FileTree
                  workspaceRoot={workspaceRoot}
                  onOpenFolder={openFolder}
                  onFileClick={openFile}
                  activeFilePath={activeTabPath}
                  autoSave={autoSave}
                  onAutoSaveChange={setAutoSave}
                  onFileOpened={openFile}
                  newFileTrigger={newFileTrigger}
                />
              </Panel>
              <PanelResizeHandle className="resize-handle" />
            </>
          )}
          <Panel id="editor" order={2} defaultSize={showPreview ? 50 : 80} minSize={30}>
            <EditorPanel
              tabs={tabs}
              activeTabPath={activeTabPath}
              onTabClick={setActiveTabPath}
              onTabDoubleClick={pinTab}
              onTabClose={closeTab}
              onContentChange={updateContent}
              onSave={saveFile}
              workspaceRoot={workspaceRoot}
              theme={theme}
            />
          </Panel>
          {showPreview && (
            <>
              <PanelResizeHandle className="resize-handle" />
              <Panel id="preview" order={3} defaultSize={30} minSize={20}>
                <PreviewPanel
                  workspaceRoot={workspaceRoot}
                  onOpenInTab={openPreviewInTab}
                  onClose={() => setShowPreview(false)}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
