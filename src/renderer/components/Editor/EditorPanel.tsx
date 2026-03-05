import React, { useRef } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { FileCode2, X, Monitor } from 'lucide-react';
import { OpenTab } from '../../pages/IDE';
import PreviewPanel from '../Preview/PreviewPanel';
import './EditorPanel.css';

interface EditorPanelProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  onTabClick: (path: string) => void;
  onTabDoubleClick?: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: () => void;
  workspaceRoot: string | null;
  theme?: string;
}

const EDITOR_OPTIONS = {
  suggestOnTriggerCharacters: false,
  quickSuggestions: false,
  parameterHints: { enabled: false },
  wordBasedSuggestions: 'currentDocument' as const,
  acceptSuggestionOnEnter: 'off' as const,
  tabCompletion: 'off' as const,
  snippetSuggestions: 'none' as const,
  codeLens: false,
  minimap: { enabled: true },
  automaticLayout: true,
  fontSize: 14,
  lineHeight: 22,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontLigatures: true,
  scrollBeyondLastLine: false,
  renderWhitespace: 'none' as const,
  cursorBlinking: 'smooth' as const,
  smoothScrolling: true,
  padding: { top: 12 },
  autoClosingBrackets: 'always' as const,
  autoClosingQuotes: 'always' as const,
  autoSurround: 'languageDefined' as const,
  autoClosingOvertype: 'always' as const,
};

export default function EditorPanel({
  tabs, activeTabPath, onTabClick, onTabDoubleClick, onTabClose, onContentChange, onSave, workspaceRoot, theme = 'dark'
}: EditorPanelProps) {
  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Enable auto-closing HTML tags via linked editing
    monaco.languages.html?.htmlDefaults?.setOptions?.({
      format: { contentUnformatted: '' },
    });

    // For HTML-like languages, auto-insert closing tag when typing '>'
    const htmlLanguages = ['html', 'xml', 'php', 'handlebars', 'razor'];
    editor.onDidChangeModelContent((e) => {
      const model = editor.getModel();
      if (!model) return;
      const lang = model.getLanguageId();
      if (!htmlLanguages.includes(lang)) return;

      for (const change of e.changes) {
        if (change.text === '>') {
          const position = editor.getPosition();
          if (!position) return;
          const lineContent = model.getLineContent(position.lineNumber);
          const beforeCursor = lineContent.substring(0, position.column - 1);

          // Match an opening tag (not self-closing, not a closing tag)
          const tagMatch = beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9-]*)\b[^/]*$/);
          if (tagMatch) {
            const tagName = tagMatch[1];
            // Skip void/self-closing HTML elements
            const voidElements = [
              'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
              'link', 'meta', 'param', 'source', 'track', 'wbr',
            ];
            if (voidElements.includes(tagName.toLowerCase())) return;

            const closingTag = `</${tagName}>`;
            editor.executeEdits('auto-close-tag', [
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

  if (tabs.length === 0) {
    return (
      <div className="editor-panel empty">
        <div className="editor-empty-state">
          <div className="editor-empty-icon"><FileCode2 size={48} strokeWidth={1} /></div>
          <h3>DevWatch Editor</h3>
          <p>Select a file from the explorer to begin</p>
          <div className="editor-shortcuts">
            <div className="shortcut"><span>Save File</span> <div className="kbd-wrap"><kbd>Ctrl</kbd>+<kbd>S</kbd></div></div>
            <div className="shortcut"><span>Close Tab</span> <div className="kbd-wrap"><kbd>Ctrl</kbd>+<kbd>W</kbd></div></div>
            <div className="shortcut"><span>Toggle Explorer</span> <div className="kbd-wrap"><kbd>Ctrl</kbd>+<kbd>B</kbd></div></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel">
      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={`tab ${tab.path === activeTabPath ? 'active' : ''}`}
            onClick={() => onTabClick(tab.path)}
            onDoubleClick={() => onTabDoubleClick?.(tab.path)}
          >
            {tab.type === 'preview' && <Monitor size={14} className="tab-icon" />}
            <span className="tab-name" style={{ fontStyle: tab.isPreviewFile && !tab.isDirty ? 'italic' : 'normal' }}>
              {tab.name}
            </span>
            {tab.isDirty && <span className="dirty-dot" title="Unsaved changes"></span>}
            <button
              className="tab-close"
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.path); }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor, Preview, or Image */}
      {activeTab && activeTab.type === 'preview' ? (
        <div className="editor-wrapper">
          <PreviewPanel workspaceRoot={workspaceRoot} isFullTab />
        </div>
      ) : activeTab && activeTab.type === 'image' ? (
        <div className="editor-wrapper image-preview-wrapper">
          <img
            src={activeTab.content}
            alt={activeTab.name}
            className="image-preview"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'image-error';
              fallback.textContent = 'Failed to load image';
              target.parentElement?.appendChild(fallback);
            }}
          />
        </div>
      ) : activeTab && (
        <div className="editor-wrapper">
          <MonacoEditor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            theme={theme === 'light' ? 'vs-light' : 'vs-dark'}
            options={EDITOR_OPTIONS}
            onMount={handleEditorMount}
            onChange={(value) => {
              if (value !== undefined) onContentChange(activeTab.path, value);
            }}
            path={activeTab.path}
          />
        </div>
      )}
    </div>
  );
}
