import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Users, LogOut, Settings, Key, CheckCircle2, Eye, EyeOff, Trash2, ToggleLeft, ToggleRight, Code2, Lightbulb, Bug, Navigation, Pencil } from 'lucide-react';
import { updateTeamName, updateTeamPassword, flushAllActivityLogs } from '../../services/appwrite';
import { cacheCredentials } from '../../services/localStore';
import { Team, EditorFeatureToggles, DEFAULT_FEATURE_TOGGLES } from '../../../shared/types';
import { useEditorFeatures } from '../../context/EditorFeaturesContext';
import '../Settings/SettingsModal.css';

// ---- Feature toggle metadata ----
interface FeatureItem {
  key: keyof EditorFeatureToggles;
  label: string;
  description: string;
}

interface FeatureCategory {
  name: string;
  icon: React.ReactNode;
  features: FeatureItem[];
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    name: 'IntelliSense & Suggestions',
    icon: <Lightbulb size={15} />,
    features: [
      { key: 'intellisenseSuggest', label: 'IntelliSense / Suggest', description: 'Auto-completion suggestions as you type' },
      { key: 'snippetSuggestions', label: 'Snippet Suggestions', description: 'Show code snippet suggestions in autocomplete' },
      { key: 'parameterHints', label: 'Parameter Hints', description: 'Show function parameter hints when typing' },
      { key: 'codeCompletionTriggerCharacters', label: 'Completion Trigger Characters', description: 'Trigger completions on special characters like . and (' },
      { key: 'htmlTagAutoSuggest', label: 'HTML Tag Suggest', description: 'Automatically suggest HTML tags when typing <' },
    ],
  },
  {
    name: 'Navigation & References',
    icon: <Navigation size={15} />,
    features: [
      { key: 'goToDefinition', label: 'Go to Definition', description: 'Navigate to the definition of a symbol' },
      { key: 'goToDeclaration', label: 'Go to Declaration', description: 'Navigate to the declaration of a symbol' },
      { key: 'goToImplementation', label: 'Go to Implementation', description: 'Navigate to the implementation of an interface/class' },
      { key: 'findReferences', label: 'Find References', description: 'Find all references to a symbol' },
      { key: 'peekDefinition', label: 'Peek Definition', description: 'Inline peek at a symbol definition' },
      { key: 'peekReferences', label: 'Peek References', description: 'Inline peek at all references' },
      { key: 'linkedEditing', label: 'Linked Editing', description: 'Automatically rename matching HTML/XML tags' },
    ],
  },
  {
    name: 'Code Editing & Formatting',
    icon: <Pencil size={15} />,
    features: [
      { key: 'renameSymbol', label: 'Rename Symbol', description: 'Rename all occurrences of a symbol' },
      { key: 'codeActionsQuickFixes', label: 'Code Actions / Quick Fixes', description: 'Show quick fix suggestions for errors and warnings' },
      { key: 'formatDocument', label: 'Format Document', description: 'Auto-format the entire document' },
      { key: 'formatSelection', label: 'Format Selection', description: 'Auto-format the selected code region' },
      { key: 'autoClosingBrackets', label: 'Auto Closing Brackets', description: 'Automatically insert closing brackets' },
      { key: 'autoClosingQuotes', label: 'Auto Closing Quotes', description: 'Automatically insert closing quotes' },
      { key: 'autoClosingComments', label: 'Auto Closing Comments', description: 'Automatically close block comments' },
      { key: 'autoClosingDelete', label: 'Auto Closing Delete', description: 'Delete closing pair when deleting opening pair' },
      { key: 'autoClosingOvertype', label: 'Auto Closing Overtype', description: 'Type over auto-inserted closing characters' },
      { key: 'autoSurround', label: 'Auto Surround', description: 'Surround selected text with brackets or quotes' },
      { key: 'closingTagAutoComplete', label: 'Closing Tag Complete', description: 'Automatically insert closing HTML/XML tags' },
    ],
  },
  {
    name: 'UI Enhancements',
    icon: <Code2 size={15} />,
    features: [
      { key: 'hover', label: 'Hover Information', description: 'Show information tooltip when hovering over symbols' },
      { key: 'codeLens', label: 'Code Lens', description: 'Show inline actionable information above code' },
      { key: 'inlineHints', label: 'Inline Hints', description: 'Show inline type hints and parameter names' },
      { key: 'inlayHints', label: 'Inlay Hints', description: 'Show inlay hints for types and parameters' },
      { key: 'lightbulbActions', label: 'Lightbulb Actions', description: 'Show lightbulb icon for available code actions' },
    ],
  },
  {
    name: 'Diagnostics & Markers',
    icon: <Bug size={15} />,
    features: [
      { key: 'markersDiagnostics', label: 'Markers / Diagnostics', description: 'Show diagnostic markers in the editor' },
      { key: 'errorSquiggles', label: 'Error Squiggles', description: 'Show red underlines for errors' },
      { key: 'warningSquiggles', label: 'Warning Squiggles', description: 'Show yellow underlines for warnings' },
    ],
  },
];

// ---- Toggle Switch Component ----
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`feature-toggle-switch ${checked ? 'on' : 'off'}${disabled ? ' disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      aria-checked={checked}
      role="switch"
      disabled={disabled}
    >
      <span className="feature-toggle-knob" />
    </button>
  );
}

// ---- Props ----
interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Team | null;
  onLogout: () => void;
  onTeamNameUpdated: (newName: string) => void;
}

export default function AdminSettingsModal({
  isOpen,
  onClose,
  user,
  onLogout,
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

  // Feature toggles
  const { featureToggles, updateFeatureToggles, loading: featuresLoading } = useEditorFeatures();
  const [localToggles, setLocalToggles] = useState<EditorFeatureToggles>({ ...DEFAULT_FEATURE_TOGGLES });
  const [featureSaveStatus, setFeatureSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [featureSaveError, setFeatureSaveError] = useState('');

  // Sync local toggles with context
  useEffect(() => {
    setLocalToggles({ ...featureToggles });
  }, [featureToggles]);

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
      setFeatureSaveStatus('idle');
      setFeatureSaveError('');
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
    : matchesSearch('Privacy');

  // Feature toggles tab search
  const featureSearchMatches = isSearching
    ? FEATURE_CATEGORIES.some(cat =>
      matchesSearch(cat.name) ||
      cat.features.some(f => matchesSearch(f.label) || matchesSearch(f.description))
    ) || matchesSearch('Editor Features') || matchesSearch('toggle') || matchesSearch('enable') || matchesSearch('disable')
    : false;

  const showEditorFeatures = !isSearching
    ? activeTab === 'Editor Features'
    : featureSearchMatches;

  // ---- Handlers ----
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

  // Feature toggle handlers
  const handleToggleFeature = (key: keyof EditorFeatureToggles) => {
    setLocalToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEnableAll = () => {
    const allOn = { ...localToggles };
    for (const key of Object.keys(allOn) as (keyof EditorFeatureToggles)[]) {
      allOn[key] = true;
    }
    setLocalToggles(allOn);
  };

  const handleDisableAll = () => {
    setLocalToggles({ ...DEFAULT_FEATURE_TOGGLES });
  };

  const handleEnableCategory = (category: FeatureCategory) => {
    const updated = { ...localToggles };
    for (const f of category.features) {
      updated[f.key] = true;
    }
    setLocalToggles(updated);
  };

  const handleDisableCategory = (category: FeatureCategory) => {
    const updated = { ...localToggles };
    for (const f of category.features) {
      updated[f.key] = false;
    }
    setLocalToggles(updated);
  };

  const handleSaveFeatures = async () => {
    setFeatureSaveStatus('saving');
    setFeatureSaveError('');
    const result = await updateFeatureToggles(localToggles);
    if (result.success) {
      setFeatureSaveStatus('saved');
      setTimeout(() => setFeatureSaveStatus('idle'), 2500);
    } else {
      setFeatureSaveStatus('error');
      setFeatureSaveError(result.error || 'Failed to save');
    }
  };

  const enabledCount = Object.values(localToggles).filter(Boolean).length;
  const totalCount = Object.keys(localToggles).length;

  const isWindows = navigator.userAgent.toLowerCase().includes('win');

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
              className={(isSearching ? showEditorFeatures : activeTab === 'Editor Features') ? 'active' : ''}
              onClick={() => setActiveTab('Editor Features')}
            >
              Editor Features
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
          </ul>
        </div>

        <div className="vscode-settings-content">
          {/* ── Editor Features Tab ── */}
          {showEditorFeatures && (
            <div className="vscode-settings-section">
              <h2 className="vscode-settings-section-title">Editor Features</h2>
              <div className="vscode-setting-description" style={{ marginBottom: 16 }}>
                Control which Monaco editor features are available to all teams. Features
                that are turned <strong>OFF</strong> will be disabled for students in the IDE.
              </div>

              {featuresLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                  Loading feature settings…
                </div>
              ) : (
                <>
                  {/* Global controls */}
                  <div className="feature-global-controls">
                    <div className="feature-counter">
                      <span className="feature-counter-num">{enabledCount}</span>
                      <span className="feature-counter-sep">/</span>
                      <span className="feature-counter-total">{totalCount}</span>
                      <span className="feature-counter-label">enabled</span>
                    </div>
                    <div className="feature-global-btns">
                      <button className="activity-log-btn secondary" onClick={handleEnableAll}>
                        <ToggleRight size={14} />
                        Enable All
                      </button>
                      <button className="activity-log-btn secondary" onClick={handleDisableAll}>
                        <ToggleLeft size={14} />
                        Disable All
                      </button>
                      <button
                        className="activity-log-btn primary"
                        onClick={handleSaveFeatures}
                        disabled={featureSaveStatus === 'saving'}
                      >
                        <CheckCircle2 size={14} />
                        {featureSaveStatus === 'saving' ? 'Saving…' : featureSaveStatus === 'saved' ? 'Saved ✓' : 'Apply Changes'}
                      </button>
                    </div>
                  </div>

                  {featureSaveStatus === 'error' && (
                    <div className="account-error" style={{ marginBottom: 12 }}>{featureSaveError}</div>
                  )}

                  {/* Categories */}
                  {FEATURE_CATEGORIES.map((category) => {
                    // If searching, only show categories that match
                    if (isSearching) {
                      const catMatches = matchesSearch(category.name) ||
                        category.features.some(f => matchesSearch(f.label) || matchesSearch(f.description));
                      if (!catMatches) return null;
                    }

                    const enabledInCat = category.features.filter(f => localToggles[f.key]).length;
                    const totalInCat = category.features.length;

                    return (
                      <div key={category.name} className="feature-category">
                        <div className="feature-category-header">
                          <div className="feature-category-title">
                            <span className="feature-category-icon">{category.icon}</span>
                            <span>{category.name}</span>
                            <span className="feature-category-count">{enabledInCat}/{totalInCat}</span>
                          </div>
                          <div className="feature-category-actions">
                            <button
                              className="feature-cat-btn"
                              onClick={() => handleEnableCategory(category)}
                              title="Enable all in this category"
                            >
                              All On
                            </button>
                            <button
                              className="feature-cat-btn"
                              onClick={() => handleDisableCategory(category)}
                              title="Disable all in this category"
                            >
                              All Off
                            </button>
                          </div>
                        </div>

                        <div className="feature-list">
                          {category.features.map((feature) => {
                            if (isSearching && !matchesSearch(feature.label) && !matchesSearch(feature.description) && !matchesSearch(category.name)) {
                              return null;
                            }
                            return (
                              <div key={feature.key} className="feature-item">
                                <div className="feature-item-info">
                                  <span className="feature-item-label">{feature.label}</span>
                                  <span className="feature-item-desc">{feature.description}</span>
                                </div>
                                <ToggleSwitch
                                  checked={localToggles[feature.key]}
                                  onChange={() => handleToggleFeature(feature.key)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── Activity Logs Tab ── */}
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

          {/* ── Account Tab ── */}
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
