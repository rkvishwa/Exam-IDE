import React, { useState, useRef, useEffect } from "react";
import {
  FolderOpen,
  LogOut,
  Settings,
  FolderInput,
  PanelRight,
  Monitor,
  Check,
  Chrome,
  Users,
} from "lucide-react";
import "./ActivityBar.css";

interface ActivityBarProps {
  teamName: string;
  isOnline: boolean;
  onOpenFolder: () => void;

  showPreviewRightPanel: boolean;
  onTogglePreviewRightPanel: () => void;

  isPreviewInTab: boolean;
  onTogglePreviewTab: () => void;

  onToggleExplorer: () => void;
  showExplorer: boolean;

  onLogout: () => void;
  theme?: string;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;

  // Collaboration
  isCollaborating?: boolean;
  onToggleCollaboration?: () => void;
}

export default function ActivityBar({
  teamName,
  isOnline,
  onOpenFolder,
  showPreviewRightPanel,
  onTogglePreviewRightPanel,
  isPreviewInTab,
  onTogglePreviewTab,
  onToggleExplorer,
  showExplorer,
  onLogout,
  theme = "dark",
  onToggleTheme = () => {},
  onOpenSettings = () => {},
  isCollaborating = false,
  onToggleCollaboration = () => {},
}: ActivityBarProps) {
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const previewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        previewMenuRef.current &&
        !previewMenuRef.current.contains(event.target as Node)
      ) {
        setShowPreviewMenu(false);
      }
    };
    if (showPreviewMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPreviewMenu]);

  return (
    <div className="activity-bar">
      <div className="activity-top">
        <button
          className={`activity-action ${showExplorer ? "active" : ""}`}
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
          <FolderInput size={22} strokeWidth={1.5} />
        </button>

        <div className="activity-menu-container" ref={previewMenuRef}>
          <button
            className={`activity-action ${showPreviewRightPanel || isPreviewInTab ? "active" : ""}`}
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
                {showPreviewRightPanel && (
                  <Check size={15} className="check-icon" />
                )}
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

        <button
          className={`activity-action ${isCollaborating ? "active collaborating" : ""}`}
          onClick={onToggleCollaboration}
          title="Collaboration (P2P)"
        >
          <Users size={22} strokeWidth={1.5} />
          {isCollaborating && <span className="collab-indicator" />}
        </button>

        <div
          className="user-profile-container"
          title={`Team: ${teamName} (${isOnline ? "Online" : "Offline"})`}
        >
          <div className="user-avatar">
            {teamName ? teamName.charAt(0).toUpperCase() : "U"}
          </div>
          <span
            className={`status-dot profile-status ${isOnline ? "online" : "offline"}`}
          />
        </div>
      </div>

      <div className="activity-bottom">
        <button
          className="activity-action"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={22} strokeWidth={1.5} />
        </button>

        <button className="activity-action" onClick={onLogout} title="Sign Out">
          <LogOut size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
