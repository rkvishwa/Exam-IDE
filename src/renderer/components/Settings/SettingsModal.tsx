import React, { useEffect } from 'react';
import { ArrowLeft, Save, RefreshCw, Palette, Settings as SettingsIcon, Monitor, Moon, Sun } from 'lucide-react';
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
}

export default function SettingsModal({
  isOpen,
  onClose,
  autoSave,
  onAutoSaveChange,
  hotReload,
  onHotReloadChange,
  theme,
  onThemeChange
}: SettingsModalProps) {
  
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

  if (!isOpen) return null;

  return (
    <div className="settings-page-overlay">
      <div className="settings-page-header">
        <button className="settings-back-button" onClick={onClose}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <div className="settings-page-container">
        <div className="settings-page-title">
          <SettingsIcon size={28} className="settings-title-icon" />
          <h1>Settings</h1>
        </div>
        
        <div className="settings-page-content">
          <div className="settings-section">
            <h2 className="settings-section-title">Editor Preferences</h2>
            
            <div className="setting-card">
              <div className="setting-icon-wrapper save-icon-wrapper">
                <Save size={20} />
              </div>
              <div className="setting-details">
                <h3>Auto Save</h3>
                <p>Automatically save files after making changes in the editor.</p>
              </div>
              <div className="setting-control">
                <label className="sleek-toggle">
                  <input 
                    type="checkbox" 
                    checked={autoSave} 
                    onChange={(e) => onAutoSaveChange(e.target.checked)} 
                  />
                  <span className="sleek-slider"></span>
                </label>
              </div>
            </div>

            <div className="setting-card">
              <div className="setting-icon-wrapper hotreload-icon-wrapper">
                <RefreshCw size={20} />
              </div>
              <div className="setting-details">
                <h3>Hot Reload</h3>
                <p>Instantly refresh the preview panel when files are saved.</p>
              </div>
              <div className="setting-control">
                <label className="sleek-toggle">
                  <input 
                    type="checkbox" 
                    checked={hotReload} 
                    onChange={(e) => onHotReloadChange(e.target.checked)} 
                  />
                  <span className="sleek-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Appearance</h2>
            
            <div className="setting-card">
              <div className="setting-icon-wrapper theme-icon-wrapper">
                <Palette size={20} />
              </div>
              <div className="setting-details">
                <h3>Theme Preference</h3>
                <p>Select your interface theme or let it match your system.</p>
              </div>
              <div className="setting-control">
                <div className="theme-selector">
                  <button 
                    className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                    onClick={() => onThemeChange('system')}
                  >
                    <Monitor size={16} />
                    System
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => onThemeChange('light')}
                  >
                    <Sun size={16} />
                    Light
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => onThemeChange('dark')}
                  >
                    <Moon size={16} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
