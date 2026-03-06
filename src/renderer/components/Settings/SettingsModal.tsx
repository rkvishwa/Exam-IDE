import React, { useState, useEffect } from 'react';
import { Search, X, Download, RefreshCw } from 'lucide-react';
import { getActivityLog, generateActivityLogPDF, clearActivityLog, ActivityEvent } from '../../services/activityLogger';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoSave: boolean;
  onAutoSaveChange: (val: boolean) => void;
  hotReload: boolean;
  onHotReloadChange: (val: boolean) => void;
  theme: string;
  onThemeChange: (val: string) => void;
  teamName: string;
}

export default function SettingsModal({
  isOpen,
  onClose,
  autoSave,
  onAutoSaveChange,
  hotReload,
  onHotReloadChange,
  theme,
  onThemeChange,
  teamName,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('Text Editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Refresh activity log when opening the modal or switching to the Activity Log tab
  useEffect(() => {
    if (isOpen && (activeTab === 'Activity Log' || searchQuery.trim().length > 0)) {
      setActivityLog(getActivityLog());
    }
  }, [isOpen, activeTab, searchQuery]);

  if (!isOpen) return null;

  const matchesSearch = (text: string) => 
    searchQuery === '' || text.toLowerCase().includes(searchQuery.toLowerCase());

  const isSearching = searchQuery.trim().length > 0;

  const showTextEditor = !isSearching 
    ? activeTab === 'Text Editor' 
    : (matchesSearch('Text Editor') || matchesSearch('Auto Save') || matchesSearch('Hot Reload') || matchesSearch('Controls auto save') || matchesSearch('Instantly refresh'));

  const showAppearance = !isSearching 
    ? activeTab === 'Appearance' 
    : (matchesSearch('Appearance') || matchesSearch('Color Theme') || matchesSearch('interface theme'));

  const shortcuts = [
    { action: 'Save File', keys: ['Ctrl', 'S'] },
    { action: 'Close Tab', keys: ['Ctrl', 'W'] },
    { action: 'New File', keys: ['Ctrl', 'N'] },
    { action: 'Toggle Explorer', keys: ['Ctrl', 'B'] },
    { action: 'Toggle Preview Panel', keys: ['Ctrl', 'Shift', 'V'] },
    { action: 'Toggle Preview Tab', keys: ['Ctrl', 'Shift', 'B'] },
  ];

  const filteredShortcuts = shortcuts.filter(s => 
    matchesSearch(s.action) || s.keys.some(k => matchesSearch(k)) || matchesSearch('Keyboard Shortcuts')
  );

  const showKeyboardShortcuts = !isSearching 
    ? activeTab === 'Keyboard Shortcuts' 
    : filteredShortcuts.length > 0;

  const showActivityLog = !isSearching 
    ? activeTab === 'Activity Log' 
    : (matchesSearch('Activity Log') || matchesSearch('Download') || matchesSearch('clipboard') || matchesSearch('online') || matchesSearch('offline'));

  const formatEventType = (type: ActivityEvent['type'], details?: string): string => {
    switch (type) {
      case 'status_online': return 'Went Online';
      case 'status_offline': return 'Went Offline';
      case 'app_focus': return 'Returned to IDE';
      case 'app_blur': {
        if (details) {
          const match = details.match(/^(?:Switched to|Active app):\s*(.+)$/i);
          if (match) {
            const raw = match[1].trim();
            const parts = raw.split(' - ');
            const appName = parts[parts.length - 1].trim() || raw;
            return `Switched To ${appName}`;
          }
        }
        return 'Switched Away';
      }
      case 'clipboard_copy': return 'Clipboard Copy';
      case 'clipboard_paste_external': return 'External Copy';
    }
  };

  const handleDownloadLog = () => {
    generateActivityLogPDF(teamName);
  };

  const handleRefreshLog = () => {
    setActivityLog(getActivityLog());
  };

  const handleClearLog = () => {
    clearActivityLog();
    setActivityLog([]);
  };

  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  const isWindows = navigator.userAgent.toLowerCase().includes('win');

  return (
    <div className="vscode-settings-overlay">
      <div 
        className="vscode-settings-header-tabs"
        style={{ paddingLeft: isWindows ? '0px' : '75px' }}
      >
        <div className="vscode-settings-tab active">User</div>
        <button className="vscode-settings-close" onClick={onClose}><X size={16}/></button>
      </div>

      <div className="vscode-settings-searchbar-container">
        <div className="vscode-search-input-wrapper">
          <Search size={16} className="vscode-search-icon" />
          <input 
            type="text" 
            placeholder="Search settings" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="vscode-search-input"
          />
        </div>
      </div>

      <div className="vscode-settings-body">
        <div className="vscode-settings-sidebar">
           <ul className="vscode-settings-tree">
             <li className={(isSearching ? showTextEditor : activeTab === 'Text Editor') ? 'active' : ''} onClick={() => setActiveTab('Text Editor')}>Text Editor</li>
             <li className={(isSearching ? showAppearance : activeTab === 'Appearance') ? 'active' : ''} onClick={() => setActiveTab('Appearance')}>Appearance</li>
             <li className={(isSearching ? showKeyboardShortcuts : activeTab === 'Keyboard Shortcuts') ? 'active' : ''} onClick={() => setActiveTab('Keyboard Shortcuts')}>Keyboard Shortcuts</li>
             <li className={(isSearching ? showActivityLog : activeTab === 'Activity Log') ? 'active' : ''} onClick={() => setActiveTab('Activity Log')}>Activity Log</li>
           </ul>
        </div>
        <div className="vscode-settings-content">
          {showTextEditor && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Text Editor</h2>
              
              {(isSearching ? (matchesSearch('Auto Save') || matchesSearch('Controls auto save') || matchesSearch('Text Editor')) : true) && (
                <div className="vscode-setting-item">
                  <div className="vscode-setting-header">
                    <span className="vscode-setting-title">Editor: <span className="highlight">Auto Save</span></span>
                    <div className="vscode-setting-description">Controls auto save of dirty editors.</div>
                  </div>
                  <div className="vscode-setting-control">
                    <select 
                      className="vscode-select" 
                      value={autoSave ? 'on' : 'off'} 
                      onChange={(e) => onAutoSaveChange(e.target.value === 'on')}
                    >
                      <option value="off">off</option>
                      <option value="on">afterDelay (on)</option>
                    </select>
                  </div>
                </div>
              )}

              {(isSearching ? (matchesSearch('Hot Reload') || matchesSearch('Instantly refresh') || matchesSearch('Text Editor')) : true) && (
                <div className="vscode-setting-item">
                  <div className="vscode-setting-header">
                    <span className="vscode-setting-title">Preview: <span className="highlight">Hot Reload</span></span>
                    <div className="vscode-setting-description">Instantly refresh the preview panel when files are saved.</div>
                  </div>
                  <div className="vscode-setting-control">
                    <label className="vscode-checkbox-label">
                      <input 
                        type="checkbox" 
                        className="vscode-checkbox" 
                        checked={hotReload} 
                        onChange={(e) => onHotReloadChange(e.target.checked)} 
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAppearance && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Appearance</h2>
              
              {(isSearching ? (matchesSearch('Color Theme') || matchesSearch('interface theme') || matchesSearch('Appearance')) : true) && (
                <div className="vscode-setting-item">
                  <div className="vscode-setting-header">
                    <span className="vscode-setting-title">Workbench: <span className="highlight">Color Theme</span></span>
                    <div className="vscode-setting-description">Select your interface theme or let it match your system.</div>
                  </div>
                  <div className="vscode-setting-control">
                     <select 
                      className="vscode-select" 
                      value={theme} 
                      onChange={(e) => onThemeChange(e.target.value)}
                    >
                      <option value="system">System Default</option>
                      <option value="light">Light Theme</option>
                      <option value="dark">Dark Theme</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {showKeyboardShortcuts && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Keyboard Shortcuts</h2>
              <div className="shortcuts-table">
                <div className="shortcuts-header">
                  <span>Action</span>
                  <span>Shortcut</span>
                </div>
                {filteredShortcuts.map((s) => (
                  <div className="shortcuts-row" key={s.action}>
                    <span className="shortcuts-action">{s.action}</span>
                    <div className="kbd-wrap">
                      {s.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="kbd-sep">+</span>}
                          <kbd>{k}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showActivityLog && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Activity Log</h2>
              <div className="vscode-setting-description" style={{ marginBottom: 16 }}>
                Your activity is tracked in the background — online/offline status changes, app switching, and clipboard copies with timestamps.
              </div>
              <div className="activity-log-actions">
                <button className="activity-log-btn primary" onClick={handleDownloadLog}>
                  <Download size={14} />
                  Download Log as PDF
                </button>
                <button className="activity-log-btn secondary" onClick={handleRefreshLog}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
                {isDev && (
                  <button className="activity-log-btn danger" onClick={handleClearLog}>
                    <X size={14} />
                    Clear Log (Dev)
                  </button>
                )}
                <span className="activity-log-count">{activityLog.length} events recorded</span>
              </div>
              {activityLog.length > 0 && (
                <div className="activity-log-preview">
                  <div className="shortcuts-table">
                    <div className="shortcuts-header">
                      <span>Time</span>
                      <span>Event</span>
                      <span>Details</span>
                    </div>
                    {activityLog.slice(-50).reverse().map((event, idx) => (
                      <div className="shortcuts-row" key={idx}>
                        <span className="activity-log-time">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`activity-log-type activity-log-type--${event.type}`}>
                          {formatEventType(event.type, event.details)}
                        </span>
                        <span className="activity-log-details" title={event.details || ''}>
                          {event.details
                            ? event.details.length > 60
                              ? event.details.substring(0, 60) + '…'
                              : event.details
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {activityLog.length > 50 && (
                    <div className="activity-log-note">
                      Showing last 50 of {activityLog.length} events. Download the PDF for the full log.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
