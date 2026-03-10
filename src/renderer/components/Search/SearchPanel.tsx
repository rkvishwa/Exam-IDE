import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, RefreshCcw, X, Search as SearchIcon, CaseSensitive, WholeWord, Regex, ListTree } from 'lucide-react';
import { formatShortcut } from '../../utils/shortcut';
import './SearchPanel.css';

interface SearchResult {
  path: string;
  name: string;
  line: number;
  text: string;
}

interface SearchPanelProps {
  workspaceRoot: string | null;
  onResultClick: (filePath: string, line?: number) => void;
}

export default function SearchPanel({ workspaceRoot, onResultClick }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [showReplace, setShowReplace] = useState(false);

  // Search options
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query && workspaceRoot) {
        performSearch();
      } else if (!query) {
        setResults([]);
        setHasSearched(false);
        setExpandedFiles(new Set());
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [query, workspaceRoot, matchCase, wholeWord]);

  const performSearch = async () => {
    if (!workspaceRoot || !query) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const searchResults = await window.electronAPI.fs.search(workspaceRoot, query);

      let filtered = searchResults;

      if (matchCase) {
        filtered = filtered.filter(f => f.text.includes(query));
      } else {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(f => f.text.toLowerCase().includes(lowerQuery));
      }

      if (wholeWord) {
        // basic whole word regex checking
        const wordBoundaryRegex = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, matchCase ? '' : 'i');
        filtered = filtered.filter(f => wordBoundaryRegex.test(f.text));
      }

      setResults(filtered);
      const allFiles = new Set(filtered.map(r => r.path));
      setExpandedFiles(allFiles);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFile = (path: string) => {
    const next = new Set(expandedFiles);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpandedFiles(next);
  };

  const toggleExpandAll = () => {
    if (expandedFiles.size > 0) {
      setExpandedFiles(new Set());
    } else {
      setExpandedFiles(new Set(results.map(r => r.path)));
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.path]) {
      acc[result.path] = [];
    }
    acc[result.path].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const renderMatchText = (text: string, searchQuery: string) => {
    if (!searchQuery) return <span>{text}</span>;
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();

    // Fallback if matchCase since indexes differ
    const searchTarget = matchCase ? text : lowerText;
    const searchString = matchCase ? searchQuery : lowerQuery;

    const index = searchTarget.indexOf(searchString);
    if (index === -1) return <span className="match-text-container">{text}</span>;

    let before = text.substring(0, index);
    const match = text.substring(index, index + searchQuery.length);
    let after = text.substring(index + searchQuery.length);

    before = before.length > 30 ? '...' + before.substring(before.length - 30) : before;
    after = after.length > 50 ? after.substring(0, 50) + '...' : after;

    return (
      <span className="match-text-container">
        {before}
        <span className="highlighted-match">{match}</span>
        {after}
      </span>
    );
  };

  return (
    <div className="search-panel-vscode">
      <div className="search-header-vscode">
        <h2>SEARCH</h2>
        <div className="header-actions">
          <button className="action-btn" title="Refresh" onClick={performSearch}>
            <RefreshCcw size={14} />
          </button>
          <button className="action-btn" title="Collapse All" onClick={toggleExpandAll}>
            <ListTree size={14} />
          </button>
        </div>
      </div>

      <div className="search-inputs-container">
        <div className="input-row">
          <button
            className={`toggle-replace-btn ${showReplace ? 'active' : ''}`}
            onClick={() => setShowReplace(!showReplace)}
            title="Toggle Replace"
          >
            {showReplace ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className="input-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="search-input-field"
            />
            <div className="input-inline-actions">
              <button className={`inline-btn ${matchCase ? 'active' : ''}`} onClick={() => setMatchCase(!matchCase)} title={`Match Case (${formatShortcut('Alt+C')})`}>Aa</button>
              <button className={`inline-btn ${wholeWord ? 'active' : ''}`} onClick={() => setWholeWord(!wholeWord)} title={`Match Whole Word (${formatShortcut('Alt+W')})`}>
                <span className="icon-text">ab</span>
              </button>
            </div>
          </div>
        </div>

        {showReplace && (
          <div className="input-row">
            <div className="spacer" />
            <div className="input-wrapper">
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace"
                className="search-input-field replace-field"
              />
              <div className="input-inline-actions">
                <button className="inline-btn" title={`Replace All (${formatShortcut('Ctrl+Alt+Enter')})`}>
                  <span className="icon-text">ab→cd</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="search-results-vscode">
        {!workspaceRoot && (
          <div className="search-message">You have not yet opened a folder.</div>
        )}

        {workspaceRoot && isSearching && (
          <div className="search-progress-bar">
            <div className="search-progress-value"></div>
          </div>
        )}

        {workspaceRoot && !isSearching && hasSearched && results.length === 0 && query && (
          <div className="search-message">No results found.</div>
        )}

        {workspaceRoot && !isSearching && Object.keys(groupedResults).length > 0 && query && (
          <div className="search-results-tree">
            {Object.entries(groupedResults).map(([filePath, fileResults]) => {
              const relativePath = filePath.replace(workspaceRoot + (filePath.includes('\\') ? '\\' : '/'), '');
              const dirPath = relativePath.substring(0, relativePath.lastIndexOf(fileResults[0].name));
              const isExpanded = expandedFiles.has(filePath);

              return (
                <div key={filePath} className="search-tree-node">
                  <div
                    className="search-file-node"
                    onClick={() => toggleFile(filePath)}
                  >
                    <span className="file-caret">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <span className="file-name-label">{fileResults[0].name}</span>
                    <span className="file-dir-label">{dirPath}</span>
                    <div className="spacer" />
                    <div className="file-match-badge">{fileResults.length}</div>
                  </div>

                  {isExpanded && (
                    <div className="search-matches-list">
                      {fileResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="search-match-node"
                          onClick={() => onResultClick(result.path, result.line)}
                        >
                          {renderMatchText(result.text.trim(), query)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}