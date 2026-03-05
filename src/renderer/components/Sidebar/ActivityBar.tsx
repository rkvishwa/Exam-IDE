import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Save, LogOut, TerminalSquare, Settings, Play, PanelRight, Monitor, Check, Moon, Sun, Chrome } from 'lucide-react';
import './ActivityBar.css';

interface ActivityBarProps {
  teamName: string;
  isOnline: boolean;
  onOpenFolder: () => void;
  onSave: () => void;
  
  showPreviewRightPanel: boolean;
  onTogglePreviewRightPanel: () => void;
  
  isPreviewInTab: boolean;
  onTogglePreviewTab: () => void;
  
  onToggleExplorer: () => void;
  showExplorer: boolean;
  onLogout: () => void;
  isDirty: boolean;
  theme?: string;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
}

export default function ActivityBar({
  teamName, isOnline, onOpenFolder, onSave, 
  showPreviewRightPanel, onTogglePreviewRightPanel,
  isPreviewInTab, onTogglePreviewTab,
  onToggleExplorer, showExplorer, onLogout, isDirty,
  theme = 'dark', onToggleTheme = () => {}, onOpenSettings = () => {}
}: ActivityBarProps) {
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const previewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewMenuRef.current && !previewMenuRef.current.contains(event.target as Node)) {
        setShowPreviewMenu(false);
      }
    };
    if (showPreviewMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPreviewMenu]);

  return (
    <div className="activity-bar">
      <div className="activity-top">
        <div className="logo-icon" title="DevWatch IDE">
          <TerminalSquare size={24} strokeWidth={1.5} color="var(--accent)" />
        </div>
        
        <button 
          className={`activity-action ${showExplorer ? 'active' : ''}`}
          onClick={onToggleExplorer}
          title="Toggle Explorer (Ctrl+B)"
        >
          <FolderOpen size={22} strokeWidth={1.5} />
        </button>
        
        <button 
          className="activity-action"
          onClick={onOpenFolder}
          title="Open Folder"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M2 10h20"/></svg>
        </button>

        <button 
          className={`activity-action ${isDirty ? 'dirty' : ''}`}
          onClick={onSave}
          title="Save File (Ctrl+S)"
        >
          <Save size={22} strokeWidth={1.5} />
          {isDirty && <span className="dirty-indicator" />}
        </button>
        
        <div className="activity-menu-container" ref={previewMenuRef}>
          <button 
            className={`activity-action ${(showPreviewRightPanel || isPreviewInTab) ? 'active' : ''}`}
            onClick={() => setShowPreviewMenu(!showPreviewMenu)}
            title="Preview Options"
          >
            <Chrome size={22} strokeWidth={1.5} />
          </button>
          
          {showPreviewMenu && (
            <div className="activity-popup-menu">
              <div className="activity-popup-header">Open Preview In</div>
              <button 
                className="activity-popup-item"
                onClick={onTogglePreviewRightPanel}
              >
                <div className="item-left">
                  <PanelRight size={15} className="item-icon" />
                  <span>Right Panel</span>
                </div>
                {showPreviewRightPanel && <Check size={15} className="check-icon" />}
              </button>
              <button 
                className="activity-popup-item"
                onClick={onTogglePreviewTab}
              >
                <div className="item-left">
                  <Monitor size={15} className="item-icon" />
                  <span>Editor Tab</span>
                </div>
                {isPreviewInTab && <Check size={15} className="check-icon" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="activity-bottom">
        <button className="activity-action" onClick={onOpenSettings} title="Settings">
          <Settings size={22} strokeWidth={1.5} />
        </button>

        <button className="activity-action" onClick={onToggleTheme} title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}>
          {theme === 'dark' ? <Moon size={22} strokeWidth={1.5} /> : theme === 'light' ? <Sun size={22} strokeWidth={1.5} /> : <Monitor size={22} strokeWidth={1.5} />}
        </button>

        <div className="user-profile-container" title={`Team: ${teamName} (${isOnline ? 'Online' : 'Offline'})`}>
          <div className="user-avatar">
            {teamName ? teamName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className={`status-dot profile-status ${isOnline ? 'online' : 'offline'}`} />
        </div>

        <button className="activity-action" onClick={onLogout} title="Sign Out">
          <LogOut size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
