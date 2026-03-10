import React, { useRef, useState, useCallback, useEffect } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
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
import { OpenTab } from "../../pages/IDE";
import PreviewPanel from "../Preview/PreviewPanel";
import { EditorFeatureToggles, DEFAULT_FEATURE_TOGGLES } from "../../../shared/types";
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
  onEditorUnmount?: () => void;
  wordWrap?: boolean;
  featureToggles?: EditorFeatureToggles;
}

const getEditorOptions = (wordWrap: boolean, ft: EditorFeatureToggles = DEFAULT_FEATURE_TOGGLES) => ({
  // IntelliSense & Suggestions
  suggestOnTriggerCharacters: ft.codeCompletionTriggerCharacters,
  quickSuggestions: ft.intellisenseSuggest
    ? { other: true, comments: true, strings: true }
    : false,
  parameterHints: { enabled: ft.parameterHints },
  wordBasedSuggestions: ft.intellisenseSuggest ? ("currentDocument" as const) : ("off" as const),
  acceptSuggestionOnEnter: ft.intellisenseSuggest ? ("on" as const) : ("off" as const),
  tabCompletion: ft.snippetSuggestions ? ("on" as const) : ("off" as const),
  snippetSuggestions: ft.snippetSuggestions ? ("inline" as const) : ("none" as const),
  suggest: {
    showMethods: ft.intellisenseSuggest,
    showFunctions: ft.intellisenseSuggest,
    showConstructors: ft.intellisenseSuggest,
    showFields: ft.intellisenseSuggest,
    showVariables: ft.intellisenseSuggest,
    showClasses: ft.intellisenseSuggest,
    showStructs: ft.intellisenseSuggest,
    showInterfaces: ft.intellisenseSuggest,
    showModules: ft.intellisenseSuggest,
    showProperties: ft.intellisenseSuggest,
    showEvents: ft.intellisenseSuggest,
    showOperators: ft.intellisenseSuggest,
    showUnits: ft.intellisenseSuggest,
    showValues: ft.intellisenseSuggest,
    showConstants: ft.intellisenseSuggest,
    showEnums: ft.intellisenseSuggest,
    showEnumMembers: ft.intellisenseSuggest,
    showKeywords: ft.intellisenseSuggest,
    showWords: ft.intellisenseSuggest,
    showColors: ft.intellisenseSuggest,
    showFiles: ft.intellisenseSuggest,
    showReferences: ft.intellisenseSuggest,
    showFolders: ft.intellisenseSuggest,
    showTypeParameters: ft.intellisenseSuggest,
    showSnippets: ft.snippetSuggestions || ft.htmlTagAutoSuggest,
  },

  // UI Enhancements
  hover: { enabled: ft.hover },
  codeLens: ft.codeLens,
  inlayHints: { enabled: ft.inlayHints ? ("on" as const) : ("off" as const) },
  inlineSuggest: { enabled: ft.inlineHints },
  lightbulb: { enabled: (ft.lightbulbActions ? "onCode" : "off") as any },
  linkedEditing: ft.linkedEditing,

  // Code Editing
  autoClosingBrackets: ft.autoClosingBrackets ? ("always" as const) : ("never" as const),
  autoClosingQuotes: ft.autoClosingQuotes ? ("always" as const) : ("never" as const),
  autoClosingComments: ft.autoClosingComments ? ("always" as const) : ("never" as const),
  autoClosingDelete: ft.autoClosingDelete ? ("always" as const) : ("never" as const),
  autoClosingOvertype: ft.autoClosingOvertype ? ("always" as const) : ("never" as const),
  autoSurround: ft.autoSurround ? ("languageDefined" as const) : ("never" as const),

  // Formatting (context menu actions are handled on mount)
  formatOnPaste: ft.formatDocument,
  formatOnType: ft.formatDocument,

  // Diagnostics - hide markers via renderValidationDecorations
  renderValidationDecorations: ft.markersDiagnostics ? ("on" as const) : ("off" as const),

  // Static options
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
  wordWrap: wordWrap ? ("on" as const) : ("off" as const),
  scrollbar: {
    horizontal: wordWrap ? ("hidden" as const) : ("auto" as const),
    horizontalScrollbarSize: wordWrap ? 0 : 10,
  },
});

function getTabIcon(tab: OpenTab) {
  if (tab.type === "preview")
    return <Monitor size={14} className="tab-icon" color="#3b82f6" />;
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
      return <Palette size={14} className="tab-icon" color="#3b82f6" />;
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
  featureToggles = DEFAULT_FEATURE_TOGGLES,
  wordWrap = true,
}: EditorPanelProps) {
  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const boundFileRef = useRef<string | null>(null);
  const modelChangeDisposerRef = useRef<{ dispose: () => void } | null>(null);
  // Counter incremented when the Monaco editor mounts, so the binding
  // useEffect re-evaluates even though editorRef is not reactive.
  const [editorMountTick, setEditorMountTick] = useState(0);

  // Single binding path: bind editor to collaboration when the editor is
  // ready, collaboration becomes active, or the active file changes.
  useEffect(() => {
    if (
      collaborationActive &&
      editorRef.current &&
      activeTabPath &&
      activeTabPath !== "__preview__"
    ) {
      // Only bind if the file has changed or wasn't bound before
      if (boundFileRef.current !== activeTabPath) {
        // Wait for the model to be ready with a small delay
        const timeoutId = setTimeout(() => {
          const model = editorRef.current?.getModel();
          if (model && model.getValue().length >= 0) {
            console.log(`Binding collaboration for file: ${activeTabPath}`);
            onEditorMount?.(
              editorRef.current!,
              activeTabPath,
              workspaceRoot || undefined,
            );
            boundFileRef.current = activeTabPath;
          }
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [collaborationActive, activeTabPath, onEditorMount, editorMountTick]);

  // Unbind when collaboration ends
  useEffect(() => {
    if (!collaborationActive && boundFileRef.current) {
      onEditorUnmount?.();
      boundFileRef.current = null;
    }
  }, [collaborationActive, onEditorUnmount]);

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

  // Keep a ref to the current feature toggles so the mount handler
  // can read the latest values without the callback identity changing.
  const featureTogglesRef = useRef(featureToggles);
  useEffect(() => {
    featureTogglesRef.current = featureToggles;

    // Reactively update code markers/diagnostics based on toggles changing post-mount
    if (editorRef.current) {
      const monaco = (window as any).monaco; // Access global monaco instance if available, or try fetching from editor model
      if (monaco) {
        const updateDiagnosticOptions = (defaults: any) => {
          if (!defaults?.setDiagnosticsOptions) return;
          const opts: any = {};
          if (!featureToggles.errorSquiggles && !featureToggles.warningSquiggles) {
            opts.noSemanticValidation = true;
            opts.noSyntaxValidation = true;
          }
          defaults.setDiagnosticsOptions(opts);
        };
        // TypeScript / JavaScript
        updateDiagnosticOptions(monaco.languages.typescript?.typescriptDefaults);
        updateDiagnosticOptions(monaco.languages.typescript?.javascriptDefaults);
      }
    }
  }, [featureToggles]);

  const htmlSnippetDisposerRef = useRef<{ dispose: () => void } | null>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Trigger re-evaluation of the binding effect now that the editor is ready
    setEditorMountTick((c) => c + 1);

    // ── Emmet-style HTML Tag Auto-suggest ──
    if (!htmlSnippetDisposerRef.current) {
      const completionLanguages = [
        "html", "xml", "php", "handlebars", "razor",
        "javascript", "typescript", "markdown",
        "python", "c", "cpp", "css", "scss", "json",
        "java", "csharp", "go", "rust", "ruby",
        "swift", "sql", "shell"
      ];
      htmlSnippetDisposerRef.current = monaco.languages.registerCompletionItemProvider(
        completionLanguages,
        {
          triggerCharacters: [
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
            "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "<"
          ],
          provideCompletionItems: (model: any, position: any) => {
            if (!featureTogglesRef.current.htmlTagAutoSuggest) {
              return { suggestions: [] };
            }

            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            // Match normal tags like "div", and Emmet multipliers like "li*5"
            // Group 1: leading space or bracket
            // Group 2: optional < bracket manually typed by user
            // Group 3: tag name
            // Group 5: optional multiplier number (if group 4 matched)
            const match = textUntilPosition.match(/(^|\s|>)(<)?([a-zA-Z][a-zA-Z0-9-]*)(\*([1-9][0-9]*))?$/);
            if (!match) return { suggestions: [] };

            const hasBracket = !!match[2];
            const word = match[3];
            const multiplierStr = match[5];
            const hasMultiplier = !!multiplierStr;
            const fullMatchLength = word.length + (hasBracket ? 1 : 0) + (hasMultiplier ? multiplierStr.length + 1 : 0);

            const wordRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - fullMatchLength,
              endColumn: position.column,
            };

            const voidElements = [
              "area", "base", "br", "col", "embed", "hr", "img", "input",
              "link", "meta", "param", "source", "track", "wbr"
            ];

            const HTML_TAGS = [
              "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "slot", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"
            ];

            // If the user actively typed a multiplier, aggressively suggest their exact tag * N
            if (hasMultiplier) {
              const count = parseInt(multiplierStr, 10);
              const tagName = word;
              const isVoid = voidElements.includes(tagName.toLowerCase());

              let generatedSnippet = "";
              for (let i = 1; i <= count; i++) {
                if (isVoid) {
                  generatedSnippet += `<${tagName}>\n`;
                } else {
                  generatedSnippet += `<${tagName}>$${i}</${tagName}>\n`;
                }
              }
              // Trim trailing newline
              generatedSnippet = generatedSnippet.replace(/\n$/, "");

              return {
                suggestions: [
                  {
                    label: `${tagName}*${count}`,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: generatedSnippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    filterText: hasBracket ? `<${tagName}` : tagName,
                    sortText: `000_${tagName}`,
                    detail: `Emit ${count} <${tagName}> tags`,
                    range: wordRange,
                  }
                ]
              };
            }

            // Otherwise, provide the array of standard tags
            return {
              suggestions: HTML_TAGS.map((tag) => {
                const isVoid = voidElements.includes(tag.toLowerCase());
                const insertText = isVoid ? `<${tag}>` : `<${tag}>$1</${tag}>`;
                return {
                  label: tag,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: insertText,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  filterText: hasBracket ? `<${tag}` : tag,
                  sortText: `000_${tag}`,
                  detail: `HTML <${tag}> tag`,
                  range: wordRange,
                };
              }),
            };
          }
        }
      );
    }

    // ── Dynamic Action Interception ──
    // Instead of overriding actions once (which cannot be easily un-done)
    // we hook into the editor's command execution to conditionally block commands
    editor.onKeyDown((e) => {
      // Very basic checking for demonstration - in Monaco intercepting commands via onKeyDown is tricky
      // The most resilient way to dynamically block actions without breaking keybinds is to overwrite the run method
    });

    // A reliable way to block UI commands/actions dynamically in Monaco is to 
    // patch the `run` method of built-in actions so they check our ref.
    const patchActionDynamically = (actionId: string, toggleKey: keyof EditorFeatureToggles) => {
      const action = editor.getAction(actionId);
      if (action && !(action as any)._isPatched) {
        const originalRun = action.run.bind(action);
        action.run = async (...args: any[]) => {
          if (!featureTogglesRef.current[toggleKey]) {
            // Block execution
            return;
          }
          return originalRun(...args);
        };
        (action as any)._isPatched = true;
      }
    };

    patchActionDynamically('editor.action.revealDefinition', 'goToDefinition');
    patchActionDynamically('editor.action.revealDefinitionAside', 'goToDefinition');
    patchActionDynamically('editor.action.revealDeclaration', 'goToDeclaration');
    patchActionDynamically('editor.action.goToImplementation', 'goToImplementation');
    patchActionDynamically('editor.action.goToReferences', 'findReferences');
    patchActionDynamically('editor.action.rename', 'renameSymbol');
    patchActionDynamically('editor.action.formatDocument', 'formatDocument');
    patchActionDynamically('editor.action.formatSelection', 'formatSelection');
    patchActionDynamically('editor.action.quickFix', 'codeActionsQuickFixes');
    patchActionDynamically('editor.action.codeAction', 'codeActionsQuickFixes');
    patchActionDynamically('editor.action.peekDefinition', 'peekDefinition');
    patchActionDynamically('editor.action.referenceSearch.trigger', 'peekReferences');

    // ── Diagnostics visibility ──
    const updateDiagnosticOptions = (defaults: any) => {
      if (!defaults?.setDiagnosticsOptions) return;
      const opts: any = {};
      // Evaluate using the current toggles
      if (!featureTogglesRef.current.errorSquiggles && !featureTogglesRef.current.warningSquiggles) {
        opts.noSemanticValidation = true;
        opts.noSyntaxValidation = true;
      }
      defaults.setDiagnosticsOptions(opts);
    };
    // TypeScript / JavaScript
    updateDiagnosticOptions(monaco.languages.typescript?.typescriptDefaults);
    updateDiagnosticOptions(monaco.languages.typescript?.javascriptDefaults);

    // ── HTML setup ──
    monaco.languages.html?.htmlDefaults?.setOptions?.({
      format: { contentUnformatted: "" },
      suggest: { html5: featureTogglesRef.current.htmlTagAutoSuggest },
    });

    // ── Closing tag auto-complete (Evaluates dynamically via ref) ──
    const autoCloseHtmlLanguages = [
      "html", "xml", "php", "handlebars", "razor",
      "javascript", "typescript", "markdown",
      "python", "c", "cpp", "css", "scss", "json",
      "java", "csharp", "go", "rust", "ruby",
      "swift", "sql", "shell"
    ];
    editor.onDidChangeModelContent((e) => {
      if (!featureTogglesRef.current.closingTagAutoComplete) return;

      const model = editor.getModel();
      if (!model) return;
      const lang = model.getLanguageId();
      if (!autoCloseHtmlLanguages.includes(lang)) return;

      // Only process manual user typing (avoiding undo/redo or large programmatic edits confusing cursor)
      if (e.isFlush) return;

      for (const change of e.changes) {
        if (change.text === ">") {
          const position = editor.getPosition();
          if (!position) return;
          const lineContent = model.getLineContent(position.lineNumber);
          const beforeCursor = lineContent.substring(0, position.column - 1);

          // Match an opening tag (not self-closing, not a closing tag)
          const tagMatch = beforeCursor.match(
            /<([a-zA-Z][a-zA-Z0-9-]*)\b[^/]*$/
          );
          if (tagMatch) {
            const tagName = tagMatch[1];
            // Skip void/self-closing HTML elements
            const voidElements = [
              "area", "base", "br", "col", "embed", "hr", "img", "input",
              "link", "meta", "param", "source", "track", "wbr",
            ];
            if (voidElements.includes(tagName.toLowerCase())) return;

            // Check if there is already a closing tag immediately after cursor
            const afterCursor = lineContent.substring(position.column - 1);
            if (afterCursor.startsWith(`</${tagName}>`)) return;

            const closingTag = `</${tagName}>`;
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
              <Radar size={48} className="welcome-logo" />
            </div>
            <h1 className="welcome-title">Sonar Code Editor</h1>
            <p className="welcome-subtitle">
              A lightweight learning environment
            </p>
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
                <kbd>Ctrl</kbd>+<kbd>B</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Panel</span>{" "}
              <div className="kbd-wrap">
                <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Tab</span>{" "}
              <div className="kbd-wrap">
                <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
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
              <FileCode2 size={48} className="welcome-logo" />
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
                <kbd>Ctrl</kbd>+<kbd>S</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Close Tab</span>{" "}
              <div className="kbd-wrap">
                <kbd>Ctrl</kbd>+<kbd>W</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Explorer</span>{" "}
              <div className="kbd-wrap">
                <kbd>Ctrl</kbd>+<kbd>B</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Panel</span>{" "}
              <div className="kbd-wrap">
                <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>
              </div>
            </div>
            <div className="shortcut">
              <span>Toggle Preview Tab</span>{" "}
              <div className="kbd-wrap">
                <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>
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
                height="100%"
                language={tab.language}
                // When collaboration is active, don't pass value prop - let y-monaco control content
                // This prevents cursor jumping when multiple users edit the same line
                {...(!collaborationActive && { value: tab.content })}
                defaultValue={tab.content}
                theme={theme === "light" ? "vs-light" : "vs-dark"}
                options={getEditorOptions(wordWrap, featureToggles)}
                onMount={isActive ? handleEditorMount : undefined}
                onChange={(value) => {
                  if (value !== undefined) {
                    if (!collaborationActive) {
                      onContentChange(tab.path, value);
                    } else if (tab.isPreviewFile) {
                      // Pin the tab when editing in collaboration mode
                      onTabDoubleClick?.(tab.path);
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
