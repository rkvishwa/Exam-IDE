import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EditorFeaturesProvider } from './context/EditorFeaturesContext';
import Login from './pages/Login';
import IDE from './pages/IDE';
import AdminDashboard from './pages/AdminDashboard';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// ── Permission gate ──────────────────────────────────────────────────────────
// On macOS the app needs Automation/System Events access to track app switching.
// If the user denied it, show a full-screen block — the app cannot be used.
// Auto-rechecks whenever the window regains focus so the user doesn't need to
// manually click anything after enabling the toggle in System Settings.
function PermissionRequired({ onRecheck }: { onRecheck: () => Promise<void> }) {
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const openSettings = async () => {
    await window.electronAPI?.system?.openPrivacyPrefs();
  };

  const recheck = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    await onRecheck();
    checkingRef.current = false;
    setChecking(false);
  }, [onRecheck]);

  // Auto-recheck whenever the window regains focus (user came back from System Settings)
  useEffect(() => {
    const handleFocus = () => { recheck(); };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [recheck]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '40px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔒</div>
      <h2 style={{ color: '#f14c4c', margin: 0, fontSize: '22px' }}>
        Permission Required
      </h2>
      <p style={{ maxWidth: '480px', lineHeight: '1.6', margin: 0, color: '#a0a0a0' }}>
        Sonar Code Editor requires <strong style={{ color: '#d4d4d4' }}>Automation</strong> permission
        to monitor app switching during exams. Without this permission the application cannot
        be used.
      </p>
      <div
        style={{
          background: '#2d2d2d',
          border: '1px solid #3e3e3e',
          borderRadius: '8px',
          padding: '16px 24px',
          maxWidth: '420px',
          textAlign: 'left',
          fontSize: '13px',
          lineHeight: '1.8',
          color: '#c0c0c0',
        }}
      >
        <strong style={{ color: '#d4d4d4' }}>How to grant permission:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Open System Settings</li>
          <li>Go to <em>Privacy &amp; Security → Automation</em></li>
          <li>Enable <strong>System Events</strong> for <strong>Sonar Code Editor</strong></li>
          <li>Return to Sonar Code Editor — it will continue automatically</li>
        </ol>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          onClick={openSettings}
          style={{
            padding: '10px 20px',
            background: '#0e639c',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Open System Settings
        </button>
        <button
          onClick={recheck}
          disabled={checking}
          style={{
            padding: '10px 20px',
            background: checking ? '#2a2a2a' : '#3e3e3e',
            color: checking ? '#666' : '#d4d4d4',
            border: '1px solid #555',
            borderRadius: '6px',
            cursor: checking ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {checking ? 'Checking…' : 'Recheck Permission'}
        </button>
      </div>
      {checking && (
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          Verifying permission…
        </p>
      )}
    </div>
  );
}

function InternetRestrictedBlock() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '40px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌐</div>
      <h2 style={{ color: '#f14c4c', margin: 0, fontSize: '22px' }}>
        Internet Access Restricted
      </h2>
      <p style={{ maxWidth: '480px', lineHeight: '1.6', margin: 0, color: '#a0a0a0' }}>
        Your admin has restricted IDE usage while connected to the internet.
        <br/><br/>
        Please disconnect from the internet or disable your network adapter to continue using Sonar Code Editor.
      </p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, internetBlocked } = useAuth();
  const isOnline = useNetworkStatus();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1e1e1e', color: '#d4d4d4' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (user.role === 'admin') return (
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );

  if (internetBlocked && isOnline) {
    return <InternetRestrictedBlock />;
  }

  return (
    <Routes>
      <Route path="/ide" element={<IDE />} />
      <Route path="*" element={<Navigate to="/ide" />} />
    </Routes>
  );
}

export default function App() {
  // null = checking, true = granted, false = denied
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Add platform class to body for OS-specific styling globally
    const platform = window.navigator.userAgent.toLowerCase();
    if (platform.includes("mac")) {
      document.body.classList.add("platform-mac");
    } else if (platform.includes("win")) {
      document.body.classList.add("platform-windows");
    } else {
      document.body.classList.add("platform-linux");
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (!window.electronAPI?.system?.checkPermission) {
      // Not in Electron (dev web mode) — allow through
      setPermissionGranted(true);
      return;
    }
    try {
      const granted = await window.electronAPI.system.checkPermission();
      setPermissionGranted(granted);
    } catch {
      setPermissionGranted(true); // allow on unexpected error
    }
  }, []);

  // Initial check on mount
  useEffect(() => { checkPermission(); }, [checkPermission]);

  if (permissionGranted === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1e1e1e', color: '#d4d4d4' }}>
        <div>Checking permissions…</div>
      </div>
    );
  }

  if (!permissionGranted) {
    // Pass the recheck function so PermissionRequired can trigger a re-check
    // (also runs automatically on window focus — see inside PermissionRequired)
    return <PermissionRequired onRecheck={checkPermission} />;
  }

  return (
    <Router>
      <EditorFeaturesProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </EditorFeaturesProvider>
    </Router>
  );
}
