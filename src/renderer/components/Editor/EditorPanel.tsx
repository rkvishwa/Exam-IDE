import React, { useRef, useState, useEffect } from "react";
import MonacoEditor, { type OnMount, type Monaco } from "@monaco-editor/react";
import {
  Radar,
  FileCode2,
  X,
  Monitor,
  FileJson,
  FileText,
  FileImage,
  Terminal,
  Database,
  ShieldAlert,
  File,
  FolderOpen,
  Code2,
  Braces,
  Palette,
} from "lucide-react";
import type { editor } from "monaco-editor";
import { formatKey } from "../../utils/shortcut";
import { OpenTab } from "../../pages/IDE";
import PreviewPanel from "../Preview/PreviewPanel";
import "./EditorPanel.css";

interface EditorPanelProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  onTabClick: (path: string) => void;
  onTabDoubleClick?: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: () => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  workspaceRoot: string | null;
  onOpenFolder?: () => void;
  theme?: string;
  activeFilePath?: string | null;
  previewInitialUrl?: string | null;
  // Collaboration props
  collaborationActive?: boolean;
  onEditorMount?: (
    editor: editor.IStandaloneCodeEditor,
    filePath: string,
    workspaceRoot?: string,
  ) => void;
  onEditorUnmount?: (filePath?: string) => void;
  wordWrap?: boolean;
  getCollaborativeContent?: (filePath: string) => string | null;
}

const getEditorOptions = (wordWrap: boolean) => ({
  suggestOnTriggerCharacters: false,
  quickSuggestions: false,
  parameterHints: { enabled: false },
  wordBasedSuggestions: "currentDocument" as const,
  acceptSuggestionOnEnter: "off" as const,
  tabCompletion: "off" as const,
  snippetSuggestions: "none" as const,
  codeLens: false,
  minimap: { enabled: true },
  automaticLayout: true,
  fontSize: 14,
  lineHeight: 22,
  fontFamily:
    "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontLigatures: true,
  scrollBeyondLastLine: false,
  renderWhitespace: "none" as const,
  cursorBlinking: "smooth" as const,
  smoothScrolling: true,
  padding: { top: 12 },
  autoClosingBrackets: "always" as const,
  autoClosingQuotes: "always" as const,
  autoSurround: "languageDefined" as const,
  autoClosingOvertype: "always" as const,
  wordWrap: wordWrap ? ("on" as const) : ("off" as const),
  scrollbar: {
    horizontal: wordWrap ? ("hidden" as const) : ("auto" as const),
    horizontalScrollbarSize: wordWrap ? 0 : 10,
  },
});

function getTabIcon(tab: OpenTab) {
  if (tab.type === "preview")
    return <Monitor size={14} className="tab-icon" color="var(--accent)" />;
  if (tab.type === "image")
    return <FileImage size={14} className="tab-icon" color="#8b5cf6" />;

  const ext = tab.name.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <Braces size={14} className="tab-icon" color="#eab308" />;
    case "json":
      return <FileJson size={14} className="tab-icon" color="#22c55e" />;
    case "html":
      return <Code2 size={14} className="tab-icon" color="#ef4444" />;
    case "css":
      return <Palette size={14} className="tab-icon" color="var(--accent)" />;
    case "md":
      return <FileText size={14} className="tab-icon" color="#a1a1aa" />;
    case "png":
    case "jpg":
    case "svg":
    case "jpeg":
    case "ico":
    case "webp":
      return <FileImage size={14} className="tab-icon" color="#8b5cf6" />;
    case "sh":
    case "bash":
      return <Terminal size={14} className="tab-icon" color="#10b981" />;
    case "php":
      return <FileCode2 size={14} className="tab-icon" color="#7b7fb5" />;
    case "sql":
      return <Database size={14} className="tab-icon" color="#f97316" />;
    case "env":
      return <ShieldAlert size={14} className="tab-icon" color="#eab308" />;
    default:
      return <File size={14} className="tab-icon" color="var(--text-muted)" />;
  }
}

const EditorPanel = React.memo(function EditorPanel({
  tabs,
  activeTabPath,
  onTabClick,
  onTabDoubleClick,
  onTabClose,
  onContentChange,
  onSave,
  onReorderTabs,
  workspaceRoot,
  onOpenFolder,
  theme = "dark",
  activeFilePath,
  previewInitialUrl,
  collaborationActive = false,
  onEditorMount,
  onEditorUnmount,
  wordWrap = true,
  getCollaborativeContent,
}: EditorPanelProps) {
  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // Map of file path → editor instance, so we can look up the correct editor
  // when switching tabs (each tab has its own MonacoEditor component).
  const editorMapRef = useRef<Map<string, editor.IStandaloneCodeEditor>>(new Map());
  // Guard to prevent auto-close handler from re-triggering on its own executeEdits
  const isLocalAutoCloseRef = useRef(false);
  // Tracks whether a local keyboard event preceded the content change.
  // onKeyDown only fires for local user input, never for remote y-monaco edits,
  // making this the most reliable way to distinguish local vs remote changes.
  const isUserInputRef = useRef(false);
  // Stable ref for collaborationActive so the auto-close handler (registered
  // once per editor on mount) always sees the latest value.
  const collaborationActiveRef = useRef(collaborationActive);
  collaborationActiveRef.current = collaborationActive;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const boundFileRef = useRef<string | null>(null);
  const modelChangeDisposerRef = useRef<{ dispose: () => void } | null>(null);
  // Counter incremented when the Monaco editor mounts, so the binding
  // useEffect re-evaluates even though editorRef is not reactive.
  const [editorMountTick, setEditorMountTick] = useState(0);
  // Track the isDeleted state per file path so we can detect when a
  // specific file goes from deleted→restored even if the active tab changed
  // in between (a single ref would lose the 'true' value on tab switch).
  const prevIsDeletedByPathRef = useRef<Map<string, boolean | undefined>>(new Map());

  // When the active tab changes, look up the correct editor from the map
  // and update editorRef.  This must run BEFORE the binding effect below
  // so that bindEditor receives the right editor instance.
  useEffect(() => {
    if (activeTabPath && editorMapRef.current.has(activeTabPath)) {
      editorRef.current = editorMapRef.current.get(activeTabPath)!;
      // Trigger re-evaluation of the binding effect
      setEditorMountTick((c) => c + 1);
    }
  }, [activeTabPath]);

  const activeTabIsDeleted = activeTab?.isDeleted;

  // Detect isDeleted transitions for ALL tabs in one place.
  // Reading prev BEFORE updating stored state ensures we catch true→false transitions
  // even when activeTabPath changed between delete and restore.
  useEffect(() => {
    tabs.forEach((tab) => {
      const prev = prevIsDeletedByPathRef.current.get(tab.path);
      const isActive = tab.path === activeTabPath;

      if (collaborationActive) {
        if (tab.isDeleted === true && prev !== true) {
          // File just got deleted. If it's the active tab, unbind its editor
          // and clear the bound-file guard so the next rebind isn't blocked.
          if (isActive) {
            console.log(`File deleted — unbinding collaboration: ${tab.path}`);
            onEditorUnmount?.(tab.path);
            boundFileRef.current = null; // Clear so rebind isn't blocked after undo
          }
        } else if (tab.isDeleted === false && prev === true && isActive) {
          // File restored and it's the active tab: force a fresh rebind.
          console.log(`File restored — forcing collaboration rebind: ${tab.path}`);
          boundFileRef.current = null;
          setEditorMountTick((c) => c + 1);
        }
      }

      // Update stored state AFTER checking the transition (read-before-write)
      prevIsDeletedByPathRef.current.set(tab.path, tab.isDeleted);
    });
  }, [tabs, collaborationActive, activeTabPath, onEditorUnmount]);

  // Keep a ref to activeTabPath so that the 100ms setTimeout closure always
  // reads the LATEST value, not a stale closure capture.
  const activeTabPathRef = useRef(activeTabPath);
  activeTabPathRef.current = activeTabPath;

  // Single binding path: bind editor to collaboration when the editor is
  // ready, collaboration becomes active, or the active file changes.
  useEffect(() => {
    if (
      collaborationActive &&
      activeTabPath &&
      !activeTabIsDeleted &&
      activeTabPath !== "__preview__"
    ) {
      // Only bind if the file has changed or wasn't bound before
      if (boundFileRef.current !== activeTabPath) {
        const filePathForBind = activeTabPath;

        const tryBind = (attempt: number) => {
          const currentPath = activeTabPathRef.current;
          // Ensure the active tab hasn't changed during the delay
          if (currentPath !== filePathForBind) return;

          // Always look up the editor from the map — editorRef.current can be
          // overwritten by any tab's onMount callback, so it's not reliable.
          const editor = editorMapRef.current.get(filePathForBind);
          if (!editor) {
            // Monaco may not have mounted yet (e.g., newly-created tab).
            // Retry a few times with growing delays before giving up.
            if (attempt < 5) {
              console.log(`Binding retry ${attempt + 1} — waiting for editor to mount: ${filePathForBind}`);
              setTimeout(() => tryBind(attempt + 1), 150 * (attempt + 1));
            } else {
              console.warn(`Binding failed after retries — no editor found for ${filePathForBind}`);
            }
            return;
          }

          // Guard: don't double-bind if the file was already bound during a retry
          if (boundFileRef.current === filePathForBind) return;

          const model = editor.getModel();
          if (model) {
            // Safety net: if Monaco model is empty but tab.content has the restored
            // file content (set by handleFileCreated on undo), seed the model now.
            if (model.getValue().length === 0) {
              const tab = tabs.find((t) => t.path === filePathForBind);
              if (tab?.content) {
                console.log(`Seeding empty Monaco model from tab.content for: ${filePathForBind}`);
                model.setValue(tab.content);
              }
            }
            console.log(`Binding collaboration for file: ${filePathForBind}`);
            onEditorMount?.(editor, filePathForBind, workspaceRoot || undefined);
            boundFileRef.current = filePathForBind;
          }
        };

        const timeoutId = setTimeout(() => tryBind(0), 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [collaborationActive, activeTabPath, activeTabIsDeleted, onEditorMount, editorMountTick]);

  // Unbind when collaboration ends, or when activeTabPath becomes null
  useEffect(() => {
    if (!collaborationActive && boundFileRef.current) {
      onEditorUnmount?.();
      boundFileRef.current = null;
    }
  }, [collaborationActive, onEditorUnmount]);

  // Unbind the previous file when the active tab changes to something else,
  // or when the last tab is closed (activeTabPath becomes null).
  useEffect(() => {
    if (activeTabPath !== boundFileRef.current && boundFileRef.current) {
        onEditorUnmount?.();
        boundFileRef.current = null;
    }
  }, [activeTabPath, onEditorUnmount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (boundFileRef.current) {
        onEditorUnmount?.();
      }
      if (modelChangeDisposerRef.current) {
        modelChangeDisposerRef.current.dispose();
      }
    };
  }, [onEditorUnmount]);

  // Editor mount handler — sets up auto-close tags, keyboard tracking,
  // and stores the editor in the per-tab map.  Called for ALL editors
  // (active and inactive) so we always have a reference for every open tab.
  // isActiveTab: true only when this is the currently active tab's editor.
  //   - If true:  update editorRef and trigger a binding re-evaluation.
  //   - If false: skip editorRef update to prevent overwriting the active
  //               editor's reference with a background tab's Monaco instance.
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco, isActiveTab: boolean) => {
    if (isActiveTab) {
      editorRef.current = editor;
      setEditorMountTick((c) => c + 1);
    }

    // Enable auto-closing HTML tags via linked editing
    monaco.languages.html?.htmlDefaults?.setOptions?.({
      format: { contentUnformatted: "" },
    });

    // Enforce LF (Line Feed) line endings universally.
    // Different OS line endings (CRLF vs LF) cause the number of characters
    // per line edit to differ between users (2 vs 1). This causes absolute
    // character offsets to drift apart between clients, breaking y-monaco's
    // RelativePosition cursor tracking completely.
    const model = editor.getModel();
    if (model) {
      model.setEOL(monaco.editor.EndOfLineSequence.LF);
    }

    // Track local keyboard input.  onKeyDown fires synchronously before
    // the character is inserted (which happens in the browser's `input`
    // event).  We use setTimeout(0) instead of queueMicrotask because
    // microtask checkpoints run between `keydown` and `input` events,
    // which would reset the flag before Monaco processes the character
    // and fires onDidChangeModelContent.  setTimeout(0) schedules a
    // macrotask that runs after ALL related events are processed.
    editor.onKeyDown(() => {
      isUserInputRef.current = true;
      setTimeout(() => {
        isUserInputRef.current = false;
      }, 0);
    });

    // For HTML-like languages, auto-insert closing tag when typing '>'
    const htmlLanguages = ["html", "xml", "php", "handlebars", "razor"];
    editor.onDidChangeModelContent((e) => {
      // Skip if this is our own auto-close edit (prevents re-entrancy)
      if (isLocalAutoCloseRef.current) return;
      // Skip remote collaboration changes — y-monaco applies bulk syncs
      // with isFlush=true, which would otherwise trigger a duplicate
      // closing tag on every remote peer.
      if (e.isFlush) return;
      // During collaboration, only auto-close for local user input.
      // Uses a ref so the check always sees the latest value (the closure
      // is created once on mount and never re-created).
      if (collaborationActiveRef.current && !isUserInputRef.current) return;
      const model = editor.getModel();
      if (!model) return;
      const lang = model.getLanguageId();
      if (!htmlLanguages.includes(lang)) return;

      for (const change of e.changes) {
        if (change.text === ">") {
          const position = editor.getPosition();
          if (!position) return;
          const lineContent = model.getLineContent(position.lineNumber);
          const beforeCursor = lineContent.substring(0, position.column - 1);

          // Match an opening tag (not self-closing, not a closing tag)
          const tagMatch = beforeCursor.match(
            /<([a-zA-Z][a-zA-Z0-9-]*)\b[^/]*$/,
          );
          if (tagMatch) {
            const tagName = tagMatch[1];
            // Skip void/self-closing HTML elements
            const voidElements = [
              "area",
              "base",
              "br",
              "col",
              "embed",
              "hr",
              "img",
              "input",
              "link",
              "meta",
              "param",
              "source",
              "track",
              "wbr",
            ];
            if (voidElements.includes(tagName.toLowerCase())) return;

            const closingTag = `</${tagName}>`;
            isLocalAutoCloseRef.current = true;
            editor.executeEdits("auto-close-tag", [
              {
                range: new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column,
                ),
                text: closingTag,
              },
            ]);
            // Keep cursor between opening and closing tags
            editor.setPosition(position);
            isLocalAutoCloseRef.current = false;
          }
        }
      }
    });
  };

  if (!workspaceRoot) {
    return (
      <div className="editor-panel empty">
        <div className="welcome-screen">
          <div className="welcome-hero">
            <div className="welcome-logo-container">
              <svg width="0" height="0">
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#000000" />
                </linearGradient>
              </svg>
              <Radar size={160} className="welcome-logo" style={{ stroke: "url(#logoGradient)" }} />
            </div>
            <h1 className="welcome-title">Sonar Code Editor</h1>
          </div>

          <div className="start-section">
            <button className="start-item" onClick={onOpenFolder}>
              <div className="start-icon">
                <FolderOpen size={24} />
              </div>
              <div className="start-text">
                <span className="start-title">Open Folder</span>
                <span className="start-desc">
                  Choose a directory to start coding
                </span>
              </div>
            </button>
          </div>

          <div className="welcome-shortcuts">
            <div className="shortcut">
              <span>Toggle Explorer</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>B</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Panel</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Tab</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="editor-panel empty">
        <div className="welcome-screen">
          <div className="welcome-hero">
            <div className="welcome-logo-container">
              <svg width="0" height="0">
                <linearGradient id="logoGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#000000" />
                </linearGradient>
              </svg>
              <FileCode2 size={160} className="welcome-logo" style={{ stroke: "url(#logoGradient2)" }} />
            </div>
            <h1 className="welcome-title">Folder Opened</h1>
            <p className="welcome-subtitle">
              Select a file from the explorer to begin
            </p>
          </div>

          <div className="welcome-shortcuts">
            <div className="shortcut">
              <span>Save File</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>S</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Close Tab</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>W</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Explorer</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>B</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Panel</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Tab</span>{" "}
              <div className="kbd-wrap">
                <kbd>{formatKey("Ctrl")}</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel">
      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map((tab, index) => (
          <div
            key={tab.path}
            className={`tab ${tab.path === activeTabPath ? "active" : ""}${dragOverIndex === index ? " drag-over" : ""}${dragIndex === index ? " dragging" : ""}`}
            onClick={() => onTabClick(tab.path)}
            onDoubleClick={() => onTabDoubleClick?.(tab.path)}
            draggable
            onDragStart={(e) => {
              setDragIndex(index);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                onReorderTabs?.(dragIndex, index);
              }
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
          >
            {getTabIcon(tab)}
            <span
              className="tab-name"
              style={{
                fontStyle:
                  tab.isPreviewFile && !tab.isDirty ? "italic" : "normal",
                textDecoration: tab.isDeleted ? "line-through" : "none",
                color: tab.isDeleted ? "red" : "inherit",
              }}
            >
              {tab.name}
            </span>
            {tab.isDirty && (
              <span className="dirty-dot" title="Unsaved changes"></span>
            )}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor, Preview, or Image */}
      {tabs.map((tab) => {
        const isActive = activeTab?.path === tab.path;
        return (
          <div
            key={tab.path}
            className={`editor-wrapper ${tab.type === "image" ? "image-preview-wrapper" : ""}`}
            style={{
              display: isActive ? "block" : "none",
              height: "100%",
              width: "100%",
            }}
          >
            {tab.type === "preview" ? (
              <PreviewPanel
                key={workspaceRoot || 'empty'}
                workspaceRoot={workspaceRoot}
                activeFilePath={activeFilePath}
                initialUrl={previewInitialUrl}
                isFullTab
              />
            ) : tab.type === "image" ? (
              <img
                src={tab.content}
                alt={tab.name}
                className="image-preview"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.className = "image-error";
                  fallback.textContent = "Failed to load image";
                  target.parentElement?.appendChild(fallback);
                }}
              />
            ) : (
              <MonacoEditor
                key={`${tab.path}-${collaborationActive ? 'collab' : 'solo'}`}
                height="100%"
                language={tab.language}
                // When collaboration is active, don't pass value prop - let y-monaco control content
                // This prevents cursor jumping when multiple users edit the same line
                {...(!collaborationActive && { value: tab.content })}
                defaultValue={
                  collaborationActive && getCollaborativeContent
                    ? (getCollaborativeContent(tab.path) ?? tab.content)
                    : tab.content
                }
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme('sonar-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#000000',
                      'editor.lineHighlightBackground': '#0a0a0a',
                    }
                  });
                  monaco.editor.defineTheme('sonar-light', {
                    base: 'vs',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#ffffff',
                    }
                  });
                }}
                theme={theme === "light" ? "sonar-light" : "sonar-dark"}
                options={getEditorOptions(wordWrap)}
                onMount={(mountedEditor, mountedMonaco) => {
                  editorMapRef.current.set(tab.path, mountedEditor);
                  handleEditorMount(mountedEditor, mountedMonaco, tab.path === activeTabPath);
                }}
                onChange={(value) => {
                  if (value !== undefined) {
                    onContentChange(tab.path, value);
                    if (collaborationActive) {
                      // During collaboration, pin preview tabs on edit
                      if (tab.isPreviewFile) {
                        onTabDoubleClick?.(tab.path);
                      }
                    }
                  }
                }}
                path={tab.path}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default EditorPanel;
