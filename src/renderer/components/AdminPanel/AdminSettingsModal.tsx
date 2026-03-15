import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, X, Users, LogOut, Settings, Key, CheckCircle2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { updateTeamName, updateTeamPassword, flushAllActivityLogs, getGlobalInternetRestriction, setGlobalInternetRestriction } from '../../services/appwrite';
import { cacheCredentials } from '../../services/localStore';
import { Team } from '../../../shared/types';
import '../Settings/SettingsModal.css';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Team | null;
  onLogout: () => void;
  theme: string;
  onThemeChange: (val: string) => void;
  accentColor: string;
  onAccentColorChange: (val: string) => void;
  onTeamNameUpdated: (newName: string) => void;
}

export default function AdminSettingsModal({
  isOpen,
  onClose,
  user,
  onLogout,
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
  onTeamNameUpdated,
}: AdminSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('Account');
  const [searchQuery, setSearchQuery] = useState('');

  // Team name state
  const [editingName, setEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Flush activity logs state
  const [flushing, setFlushing] = useState(false);
  const [flushError, setFlushError] = useState('');
  const [flushSuccess, setFlushSuccess] = useState('');

  // Restriction state
  const [globalRestriction, setGlobalRestriction] = useState(false);
  const [savingRestriction, setSavingRestriction] = useState(false);
  const [restrictionError, setRestrictionError] = useState('');
  const [restrictionSuccess, setRestrictionSuccess] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('Account');
      setSearchQuery('');
      setNewTeamName(user?.teamName || '');
      setEditingName(false);
      setNameError('');
      setNameSuccess('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setPasswordSuccess('');
      setFlushError('');
      setFlushSuccess('');
      setGlobalRestriction(false);
      setRestrictionError('');
      setRestrictionSuccess('');
      if (user?.role === 'admin') {
        getGlobalInternetRestriction().then(setGlobalRestriction).catch(console.error);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const matchesSearch = (text: string) =>
    searchQuery === '' || text.toLowerCase().includes(searchQuery.toLowerCase());

  const isSearching = searchQuery.trim().length > 0;

  const showAccount = !isSearching
    ? activeTab === 'Account'
    : matchesSearch('Account') || matchesSearch('Team') || matchesSearch('Name') || matchesSearch('Password') || matchesSearch('Sign Out');

  const showActivityLogs = !isSearching
    ? activeTab === 'Activity Logs'
    : matchesSearch('Flush') || matchesSearch('Activity') || matchesSearch('Logs');

  const showPrivacy = !isSearching
    ? activeTab === 'Privacy'
    : matchesSearch('Privacy') || matchesSearch('Block') || matchesSearch('Internet') || matchesSearch('Restriction');

  const showAppearance = !isSearching
    ? activeTab === 'Appearance'
    : matchesSearch('Appearance') || matchesSearch('Color Theme') || matchesSearch('interface theme');

  const handleSaveName = async () => {
    const trimmed = newTeamName.trim();
    if (!trimmed) { setNameError('Team name cannot be empty'); return; }
    if (!user?.$id) return;
    if (trimmed === user.teamName) { setEditingName(false); return; }

    setSavingName(true);
    setNameError('');
    setNameSuccess('');
    const result = await updateTeamName(user.$id, trimmed);
    if (result.success) {
      setNameSuccess('Team name updated successfully');
      setEditingName(false);
      onTeamNameUpdated(trimmed);
    } else {
      setNameError(result.error || 'Failed to update team name');
    }
    setSavingName(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword) { setPasswordError('Please enter your current password'); return; }
    if (!newPassword) { setPasswordError('Please enter a new password'); return; }
    if (newPassword.length < 4) { setPasswordError('New password must be at least 4 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match'); return; }
    if (!user?.$id) return;

    setSavingPassword(true);
    const result = await updateTeamPassword(user.$id, oldPassword, newPassword);
    if (result.success) {
      cacheCredentials(user.teamName, newPassword, user.$id, user.role);
      setPasswordSuccess('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error || 'Failed to update password');
    }
    setSavingPassword(false);
  };

  const handleFlushLogs = async () => {
    if (!window.confirm('Are you sure you want to flush all activity logs? This action cannot be undone.')) return;
    setFlushing(true);
    setFlushError('');
    setFlushSuccess('');
    const result = await flushAllActivityLogs();
    if (result.success) {
      setFlushSuccess('All activity logs have been flushed successfully');
    } else {
      setFlushError(result.error || 'Failed to flush activity logs');
    }
    setFlushing(false);
  };

  const handleToggleRestriction = async (checked: boolean) => {
    setSavingRestriction(true);
    setRestrictionError('');
    setRestrictionSuccess('');
    const result = await setGlobalInternetRestriction(checked);
    if (result.success) {
      setGlobalRestriction(checked);
      setRestrictionSuccess(checked ? 'Internet blocking enabled for all teams' : 'Internet blocking disabled for all teams');
      setTimeout(() => setRestrictionSuccess(''), 3000);
    } else {
      setRestrictionError(result.error || 'Failed to update restriction');
    }
    setSavingRestriction(false);
  };

  const isWindows = navigator.userAgent.toLowerCase().includes('win');

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
        style={{ paddingLeft: isWindows ? '0px' : '75px' }}
      >
        <div className="vscode-settings-tab active">
          Admin Settings
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
              className={(isSearching ? showAccount : activeTab === 'Account') ? 'active' : ''}
              onClick={() => setActiveTab('Account')}
            >
              Account
            </li>
            <li
              className={(isSearching ? showActivityLogs : activeTab === 'Activity Logs') ? 'active' : ''}
              onClick={() => setActiveTab('Activity Logs')}
            >
              Activity Logs
            </li>
            <li
              className={(isSearching ? showPrivacy : activeTab === 'Privacy') ? 'active' : ''}
              onClick={() => setActiveTab('Privacy')}
            >
              Privacy
            </li>
            <li
              className={(isSearching ? showAppearance : activeTab === 'Appearance') ? 'active' : ''}
              onClick={() => setActiveTab('Appearance')}
            >
              Appearance
            </li>
          </ul>
        </div>

        <div className="vscode-settings-content">
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
                        aria-label="Color Theme"
                        title="Color Theme"
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

          {showActivityLogs && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Activity Logs</h2>

              <div className="account-card">
                <div className="account-members-section">
                  <div className="account-members-header">
                    <span className="vscode-setting-title"><span className="highlight">Flush Activity Logs</span></span>
                  </div>
                  <div className="vscode-setting-description">
                    Clear all activity log data for every team from the database and reset their local logs. New logs will be recorded from this point forward.
                  </div>

                  <div className="admin-password-form">
                    <button
                      className="activity-log-btn danger"
                      onClick={handleFlushLogs}
                      disabled={flushing}
                      style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    >
                      <Trash2 size={14} />
                      {flushing ? 'Flushing...' : 'Flush Logs'}
                    </button>
                  </div>
                  {flushError && <div className="account-error">{flushError}</div>}
                  {flushSuccess && <div className="account-success"><CheckCircle2 size={12} /> {flushSuccess}</div>}
                </div>
              </div>
            </div>
          )}

          {showPrivacy && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Privacy</h2>

              <div className="account-card">
                <div className="account-members-section">
                  <div className="account-members-header">
                    <span className="vscode-setting-title"><span className="highlight">Internet Restriction</span></span>
                  </div>
                  <div className="vscode-setting-description">Control internet access restrictions for all non-admin teams.</div>

                  <div className="admin-password-form">
                    <div className="vscode-setting-item" style={{ padding: 0, border: 'none' }}>
                      <div className="vscode-setting-header">
                        <span className="vscode-setting-title" style={{ fontSize: 13, color: '#d4d4d4' }}>Block Internet Access</span>
                        <div className="vscode-setting-description">If enabled, non-admin teams will be restricted from using the IDE while connected to the internet.</div>
                      </div>
                      <div className="vscode-setting-control">
                        <label className="vscode-checkbox-label">
                          <input
                            type="checkbox"
                            className="vscode-checkbox"
                            checked={globalRestriction}
                            aria-label="Block Internet Access"
                            title="Block Internet Access"
                            onChange={(e) => handleToggleRestriction(e.target.checked)}
                            disabled={savingRestriction}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  {restrictionError && <div className="account-error">{restrictionError}</div>}
                  {restrictionSuccess && <div className="account-success"><CheckCircle2 size={12} /> {restrictionSuccess}</div>}
                </div>
              </div>
            </div>
          )}

          {showAccount && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Account</h2>

              <div className="account-card">
                {/* Team Name */}
                <div className="account-members-section">
                  <div className="account-members-header">
                    <span className="vscode-setting-title"><span className="highlight">Team Name</span></span>
                  </div>

                  {!editingName ? (
                    <div className="account-team-name" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={16} />
                        <span>{user?.teamName || 'Admin'}</span>
                      </div>
                      <button
                        className="activity-log-btn secondary"
                        onClick={() => { setEditingName(true); setNewTeamName(user?.teamName || ''); setNameError(''); setNameSuccess(''); }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="account-add-member">
                      <input
                        type="text"
                        className="vscode-search-input account-member-input"
                        placeholder="Enter new team name"
                        value={newTeamName}
                        onChange={(e) => { setNewTeamName(e.target.value); setNameError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                      />
                      <button
                        className="activity-log-btn primary"
                        onClick={handleSaveName}
                        disabled={savingName}
                      >
                        {savingName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="activity-log-btn secondary"
                        onClick={() => { setEditingName(false); setNameError(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {nameError && <div className="account-error">{nameError}</div>}
                  {nameSuccess && <div className="account-success"><CheckCircle2 size={12} /> {nameSuccess}</div>}
                </div>

                {/* Change Password */}
                <div className="account-members-section">
                  <div className="account-members-header">
                    <span className="vscode-setting-title"><span className="highlight">Change Password</span></span>
                  </div>
                  <div className="vscode-setting-description">Update your admin account password.</div>

                  <div className="admin-password-form">
                    <div className="admin-password-field">
                      <label className="admin-password-label">Current Password</label>
                      <div className="admin-password-input-wrap">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          className="vscode-search-input admin-password-input"
                          placeholder="Enter current password"
                          value={oldPassword}
                          onChange={(e) => { setOldPassword(e.target.value); setPasswordError(''); }}
                        />
                        <button type="button" className="admin-password-eye" onClick={() => setShowOldPassword((v) => !v)}>
                          {showOldPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="admin-password-field">
                      <label className="admin-password-label">New Password</label>
                      <div className="admin-password-input-wrap">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="vscode-search-input admin-password-input"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                        />
                        <button type="button" className="admin-password-eye" onClick={() => setShowNewPassword((v) => !v)}>
                          {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="admin-password-field">
                      <label className="admin-password-label">Confirm New Password</label>
                      <div className="admin-password-input-wrap">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="vscode-search-input admin-password-input"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
                        />
                        <button type="button" className="admin-password-eye" onClick={() => setShowConfirmPassword((v) => !v)}>
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <button
                      className="activity-log-btn primary"
                      onClick={handleChangePassword}
                      disabled={savingPassword}
                      style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    >
                      <Key size={14} />
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                  {passwordError && <div className="account-error">{passwordError}</div>}
                  {passwordSuccess && <div className="account-success"><CheckCircle2 size={12} /> {passwordSuccess}</div>}
                </div>

                {/* Sign Out */}
                <div className="account-signout">
                  <button className="activity-log-btn danger" onClick={onLogout}>
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
