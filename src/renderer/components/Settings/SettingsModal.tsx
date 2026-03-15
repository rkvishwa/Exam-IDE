import React, { useState, useEffect } from "react";
import {
  Search,
  ArrowLeft,
  X,
  Download,
  RefreshCw,
  UserPlus,
  LogOut,
  Users,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  getActivityLog,
  generateActivityLogPDF,
  clearActivityLog,
  ActivityEvent,
} from "../../services/activityLogger";
import {
  addTeamMember,
  getTeamById,
  changeTeamPassword,
} from "../../services/appwrite";
import { cacheCredentials } from "../../services/localStore";
import { Team } from "../../../shared/types";
import { formatKey, isMac } from "../../utils/shortcut";
import "./SettingsModal.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoSave: boolean;
  onAutoSaveChange: (val: boolean) => void;
  hotReload: boolean;
  onHotReloadChange: (val: boolean) => void;
  theme: string;
  onThemeChange: (val: string) => void;
  accentColor: string;
  onAccentColorChange: (val: string) => void;
  wordWrap: boolean;
  onWordWrapChange: (val: boolean) => void;
  showCollabUsernames: boolean;
  onShowCollabUsernamesChange: (val: boolean) => void;
  collabUsernameOpacity: number;
  onCollabUsernameOpacityChange: (val: number) => void;
  teamName: string;
  user: Team | null;
  onLogout: () => void;
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
  accentColor,
  onAccentColorChange,
  wordWrap,
  onWordWrapChange,
  showCollabUsernames,
  onShowCollabUsernamesChange,
  collabUsernameOpacity,
  onCollabUsernameOpacityChange,
  teamName,
  user,
  onLogout,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("Text Editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [members, setMembers] = useState<string[]>(user?.studentIds || []);
  const [newMember, setNewMember] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset active tab to default when modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("Text Editor");
      setSearchQuery("");
    }
  }, [isOpen]);

  // Refresh activity log when opening the modal or switching to the Activity Log tab
  useEffect(() => {
    if (
      isOpen &&
      (activeTab === "Activity Log" || searchQuery.trim().length > 0)
    ) {
      setActivityLog(getActivityLog());
    }
  }, [isOpen, activeTab, searchQuery]);

  // Refresh members when opening Account tab
  useEffect(() => {
    if (isOpen && activeTab === "Account" && user?.$id) {
      getTeamById(user.$id)
        .then((team) => {
          if (team?.studentIds) setMembers(team.studentIds);
        })
        .catch(() => { });
    }
  }, [isOpen, activeTab, user]);

  if (!isOpen) return null;

  const matchesSearch = (text: string) =>
    searchQuery === "" ||
    text.toLowerCase().includes(searchQuery.toLowerCase());

  const isSearching = searchQuery.trim().length > 0;

  const showTextEditor = !isSearching
    ? activeTab === "Text Editor"
    : matchesSearch("Text Editor") ||
    matchesSearch("Auto Save") ||
    matchesSearch("Hot Reload") ||
    matchesSearch("Word Wrap") ||
    matchesSearch("Controls auto save") ||
    matchesSearch("Instantly refresh") ||
    matchesSearch("wrap long lines");

  const showAppearance = !isSearching
    ? activeTab === "Appearance"
    : matchesSearch("Appearance") ||
    matchesSearch("Color Theme") ||
    matchesSearch("interface theme");

  const showCollaboration = !isSearching
    ? activeTab === "Collaboration"
    : matchesSearch("Collaboration") ||
    matchesSearch("Show Usernames") ||
    matchesSearch("cursor") ||
    matchesSearch("Username Opacity") ||
    matchesSearch("collaborator");

  const showAccount = !isSearching
    ? activeTab === "Account"
    : matchesSearch("Account") ||
    matchesSearch("Team") ||
    matchesSearch("Members") ||
    matchesSearch("Sign Out");

  const showSecurity = !isSearching
    ? activeTab === "Security"
    : matchesSearch("Security") ||
    matchesSearch("Password") ||
    matchesSearch("Change Password");

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!oldPassword.trim()) {
      setPasswordError("Enter your current password");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("New password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (!user?.$id) return;
    setChangingPassword(true);
    const result = await changeTeamPassword(user.$id, oldPassword, newPassword);
    if (result.success) {
      cacheCredentials(user.teamName, newPassword, user.$id, user.role);
      setPasswordSuccess("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError(result.error || "Failed to change password");
    }
    setChangingPassword(false);
  };

  const handleAddMember = async () => {
    const trimmed = newMember.trim();
    if (!trimmed) return;
    if (!user?.$id) return;
    setAddingMember(true);
    setAddMemberError("");
    const result = await addTeamMember(user.$id, trimmed);
    if (result.success) {
      setMembers((prev) => [...prev, trimmed]);
      setNewMember("");
    } else {
      setAddMemberError(result.error || "Failed to add member");
    }
    setAddingMember(false);
  };

  const shortcuts = [
    { action: "Save File", keys: [formatKey("Ctrl"), "S"] },
    { action: "Close Tab", keys: [formatKey("Ctrl"), "W"] },
    { action: "New File", keys: [formatKey("Ctrl"), "N"] },
    { action: "Toggle Explorer", keys: [formatKey("Ctrl"), "B"] },
    { action: "Toggle Preview Panel", keys: [formatKey("Ctrl"), "Shift", "V"] },
    { action: "Toggle Preview Tab", keys: [formatKey("Ctrl"), "Shift", "B"] },
    { action: "Rename File / Folder", keys: ["F2"] },
    { action: "Delete File / Folder", keys: isMac ? ["⌘", "⌫"] : ["Del"] },
    { action: "Undo Delete", keys: [formatKey("Ctrl"), "Z"] },
  ];

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      matchesSearch(s.action) ||
      s.keys.some((k) => matchesSearch(k)) ||
      matchesSearch("Keyboard Shortcuts") ||
      matchesSearch("rename") ||
      matchesSearch("delete") ||
      matchesSearch("undo"),
  );

  const showKeyboardShortcuts = !isSearching
    ? activeTab === "Keyboard Shortcuts"
    : filteredShortcuts.length > 0;

  const showActivityLog = !isSearching
    ? activeTab === "Activity Log"
    : matchesSearch("Activity Log") ||
    matchesSearch("Download") ||
    matchesSearch("clipboard") ||
    matchesSearch("online") ||
    matchesSearch("offline");

  const formatEventType = (
    type: ActivityEvent["type"],
    details?: string,
  ): string => {
    switch (type) {
      case "status_online":
        return "Went Online";
      case "status_offline":
        return "Went Offline";
      case "app_focus":
        return "Returned to IDE";
      case "app_blur": {
        if (details) {
          const match = details.match(/^(?:Switched to|Active app):\s*(.+)$/i);
          if (match) {
            const raw = match[1].trim();
            const parts = raw.split(" - ");
            const appName = parts[parts.length - 1].trim() || raw;
            return `Switched To ${appName}`;
          }
        }
        return "Switched Away";
      }
      case "clipboard_copy":
        return "Clipboard Copy";
      case "clipboard_paste_external":
        return "External Copy";
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

  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  const isWindows = navigator.userAgent.toLowerCase().includes("win");

  const PRESET_COLORS = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Teal", value: "#0d9488" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Green", value: "#10b981" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Pink", value: "#ec4899" },
  ];

  return (
    <div className="vscode-settings-overlay">
      <div
        className="vscode-settings-header-tabs"
        style={{ paddingLeft: isWindows ? "0px" : "75px" }}
      >
        <div className="vscode-settings-tab active">
          Settings
          <button className="vscode-settings-tab-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
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
            <li
              className={
                (isSearching ? showTextEditor : activeTab === "Text Editor")
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Text Editor")}
            >
              Text Editor
            </li>
            <li
              className={
                (isSearching ? showAppearance : activeTab === "Appearance")
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Appearance")}
            >
              Appearance
            </li>
            <li
              className={
                (
                  isSearching
                    ? showKeyboardShortcuts
                    : activeTab === "Keyboard Shortcuts"
                )
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Keyboard Shortcuts")}
            >
              Keyboard Shortcuts
            </li>
            <li
              className={
                (
                  isSearching
                    ? showCollaboration
                    : activeTab === "Collaboration"
                )
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Collaboration")}
            >
              Collaboration
            </li>
            <li
              className={
                (isSearching ? showActivityLog : activeTab === "Activity Log")
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Activity Log")}
            >
              Activity Log
            </li>
            <li
              className={
                (isSearching ? showSecurity : activeTab === "Security")
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Security")}
            >
              Security
            </li>
            <li
              className={
                (isSearching ? showAccount : activeTab === "Account")
                  ? "active"
                  : ""
              }
              onClick={() => setActiveTab("Account")}
            >
              Account
            </li>
          </ul>
        </div>
        <div className="vscode-settings-content">
          {showTextEditor && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Text Editor</h2>

              {(isSearching
                ? matchesSearch("Auto Save") ||
                matchesSearch("Controls auto save") ||
                matchesSearch("Text Editor")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Editor: <span className="highlight">Auto Save</span>
                      </span>
                      <div className="vscode-setting-description">
                        Controls auto save of dirty editors.
                      </div>
                    </div>
                    <div className="vscode-setting-control">
                      <select
                        className="vscode-select"
                        value={autoSave ? "on" : "off"}
                        onChange={(e) =>
                          onAutoSaveChange(e.target.value === "on")
                        }
                      >
                        <option value="off">off</option>
                        <option value="on">afterDelay (on)</option>
                      </select>
                    </div>
                  </div>
                )}

              {(isSearching
                ? matchesSearch("Hot Reload") ||
                matchesSearch("Instantly refresh") ||
                matchesSearch("Text Editor")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Preview: <span className="highlight">Hot Reload</span>
                      </span>
                      <div className="vscode-setting-description">
                        Instantly refresh the preview panel when files are saved.
                      </div>
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

              {(isSearching
                ? matchesSearch("Word Wrap") ||
                matchesSearch("wrap long lines") ||
                matchesSearch("Text Editor")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Editor: <span className="highlight">Word Wrap</span>
                      </span>
                      <div className="vscode-setting-description">
                        Wrap long lines in the editor to fit within the viewport.
                      </div>
                    </div>
                    <div className="vscode-setting-control">
                      <label className="vscode-checkbox-label">
                        <input
                          type="checkbox"
                          className="vscode-checkbox"
                          checked={wordWrap}
                          onChange={(e) => onWordWrapChange(e.target.checked)}
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

              {(isSearching
                ? matchesSearch("Color Theme") ||
                matchesSearch("interface theme") ||
                matchesSearch("Appearance")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Workbench: <span className="highlight">Color Theme</span>
                      </span>
                      <div className="vscode-setting-description">
                        Select your interface theme or let it match your system.
                      </div>
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

              {(isSearching
                ? matchesSearch("Accent Color") ||
                matchesSearch("custom color") ||
                matchesSearch("Appearance")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Workbench: <span className="highlight">Accent Color</span>
                      </span>
                      <div className="vscode-setting-description">
                        Select a custom accent color for the interface (default is blue).
                      </div>
                    </div>
                    <div className="vscode-setting-control color-picker-control">
                      <div className="color-presets">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.value}
                            className={`color-preset-btn ${accentColor.toLowerCase() === c.value.toLowerCase() ? "active" : ""}`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                            onClick={() => onAccentColorChange(c.value)}
                          />
                        ))}
                      </div>
                      <div className="custom-color-wrap">
                        <input
                          type="color"
                          className="vscode-color-picker"
                          value={accentColor}
                          onChange={(e) => onAccentColorChange(e.target.value)}
                          title="Custom Color"
                        />
                        <span className="custom-color-hex">{accentColor.toUpperCase()}</span>
                        <button 
                          className="activity-log-btn secondary reset-color-btn"
                          onClick={() => onAccentColorChange('#3b82f6')}
                          disabled={accentColor.toLowerCase() === '#3b82f6'}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {showKeyboardShortcuts && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">
                Keyboard Shortcuts
              </h2>
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

          {showCollaboration && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Collaboration</h2>

              {(isSearching
                ? matchesSearch("Show Usernames") ||
                matchesSearch("cursor") ||
                matchesSearch("collaborator") ||
                matchesSearch("Collaboration")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Collaboration:{" "}
                        <span className="highlight">Show Usernames</span>
                      </span>
                      <div className="vscode-setting-description">
                        Display collaborator usernames near their cursor in the
                        editor.
                      </div>
                    </div>
                    <div className="vscode-setting-control">
                      <label className="vscode-checkbox-label">
                        <input
                          type="checkbox"
                          className="vscode-checkbox"
                          checked={showCollabUsernames}
                          onChange={(e) =>
                            onShowCollabUsernamesChange(e.target.checked)
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

              {(isSearching
                ? matchesSearch("Username Opacity") ||
                matchesSearch("opacity") ||
                matchesSearch("Collaboration")
                : true) && (
                  <div className="vscode-setting-item">
                    <div className="vscode-setting-header">
                      <span className="vscode-setting-title">
                        Collaboration:{" "}
                        <span className="highlight">Username Opacity</span>
                      </span>
                      <div className="vscode-setting-description">
                        Control the opacity of collaborator username labels near
                        the cursor (0 = fully transparent, 100 = fully opaque).
                      </div>
                    </div>
                    <div className="vscode-setting-control">
                      <div className="vscode-range-control">
                        <input
                          type="range"
                          className="vscode-range"
                          min={0}
                          max={100}
                          step={5}
                          value={collabUsernameOpacity}
                          onChange={(e) =>
                            onCollabUsernameOpacityChange(Number(e.target.value))
                          }
                          disabled={!showCollabUsernames}
                        />
                        <span className="vscode-range-value">
                          {collabUsernameOpacity}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {showActivityLog && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Activity Log</h2>
              <div
                className="vscode-setting-description"
                style={{ marginBottom: 16 }}
              >
                Your activity is tracked in the background — online/offline
                status changes, app switching, and clipboard copies with
                timestamps.
              </div>
              <div className="activity-log-actions">
                <button
                  className="activity-log-btn primary"
                  onClick={handleDownloadLog}
                >
                  <Download size={14} />
                  Download Log as PDF
                </button>
                <button
                  className="activity-log-btn secondary"
                  onClick={handleRefreshLog}
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                {isDev && (
                  <button
                    className="activity-log-btn danger"
                    onClick={handleClearLog}
                  >
                    <X size={14} />
                    Clear Log (Dev)
                  </button>
                )}
                <span className="activity-log-count">
                  {activityLog.length} events recorded
                </span>
              </div>
              {activityLog.length > 0 && (
                <div className="activity-log-preview">
                  <div className="shortcuts-table">
                    <div className="shortcuts-header">
                      <span>Time</span>
                      <span>Event</span>
                      <span>Details</span>
                    </div>
                    {activityLog
                      .slice(-50)
                      .reverse()
                      .map((event, idx) => (
                        <div className="shortcuts-row" key={idx}>
                          <span className="activity-log-time">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`activity-log-type activity-log-type--${event.type}`}
                          >
                            {formatEventType(event.type, event.details)}
                          </span>
                          <span
                            className="activity-log-details"
                            title={event.details || ""}
                          >
                            {event.details
                              ? event.details.length > 60
                                ? event.details.substring(0, 60) + "…"
                                : event.details
                              : "—"}
                          </span>
                        </div>
                      ))}
                  </div>
                  {activityLog.length > 50 && (
                    <div className="activity-log-note">
                      Showing last 50 of {activityLog.length} events. Download
                      the PDF for the full log.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showSecurity && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Security</h2>

              <div className="security-card">
                <div className="security-header">
                  <Lock size={16} />
                  <span>Change Password</span>
                </div>

                <div className="security-form">
                  <div className="security-field">
                    <label className="vscode-setting-title">
                      Current Password
                    </label>
                    <div className="security-input-wrap">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        className="vscode-search-input security-input"
                        placeholder="Enter current password"
                        value={oldPassword}
                        onChange={(e) => {
                          setOldPassword(e.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                      />
                      <button
                        className="security-eye-btn"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        type="button"
                      >
                        {showOldPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="security-field">
                    <label className="vscode-setting-title">New Password</label>
                    <div className="security-input-wrap">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="vscode-search-input security-input"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                      />
                      <button
                        className="security-eye-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        type="button"
                      >
                        {showNewPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="security-field">
                    <label className="vscode-setting-title">
                      Confirm New Password
                    </label>
                    <div className="security-input-wrap">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="vscode-search-input security-input"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleChangePassword();
                        }}
                      />
                      <button
                        className="security-eye-btn"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        type="button"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <div className="account-error">{passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div className="security-success">{passwordSuccess}</div>
                  )}

                  <button
                    className="activity-log-btn primary"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                  >
                    <Lock size={14} />
                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAccount && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Account</h2>

              <div className="account-card">
                <div className="account-team-name">
                  <Users size={16} />
                  <span>{user?.teamName || teamName}</span>
                </div>

                <div className="account-members-section">
                  <div className="account-members-header">
                    <span className="vscode-setting-title">Team Members</span>
                    <span className="account-members-count">
                      {members.length} / 5
                    </span>
                  </div>

                  {members.length > 0 ? (
                    <div className="account-members-list">
                      {members.map((member, idx) => (
                        <div className="account-member-row" key={idx}>
                          <span className="account-member-index">
                            {idx + 1}.
                          </span>
                          <span className="account-member-id">{member}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="vscode-setting-description">
                      No members added yet.
                    </div>
                  )}

                  {members.length < 5 && (
                    <div className="account-add-member">
                      <input
                        type="text"
                        className="vscode-search-input account-member-input"
                        placeholder="Enter student ID"
                        value={newMember}
                        onChange={(e) => {
                          setNewMember(e.target.value);
                          setAddMemberError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddMember();
                        }}
                      />
                      <button
                        className="activity-log-btn primary"
                        onClick={handleAddMember}
                        disabled={addingMember || !newMember.trim()}
                      >
                        <UserPlus size={14} />
                        {addingMember ? "Adding..." : "Add"}
                      </button>
                    </div>
                  )}
                  {addMemberError && (
                    <div className="account-error">{addMemberError}</div>
                  )}
                </div>

                <div className="account-signout">
                  <button
                    className="activity-log-btn danger"
                    onClick={onLogout}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
