import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Wifi,
  WifiOff,
  Play,
  Square,
  Copy,
  Check,
  Globe,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { CollaborationStatus, CollaborationUser } from "../../../shared/types";
import "./CollaborationPanel.css";

interface CollaborationPanelProps {
  onSessionStart: (
    mode: "host" | "client",
    userName: string,
    hostIp?: string,
  ) => void;
  onSessionStop: () => void;
  collaborationStatus: CollaborationStatus | null;
  connectionError?: string | null;
  onClearConnectionError?: () => void;
}

export default function CollaborationPanel({
  onSessionStart,
  onSessionStop,
  collaborationStatus,
  connectionError,
  onClearConnectionError,
}: CollaborationPanelProps) {
  const [userName, setUserName] = useState("");
  const [hostIp, setHostIp] = useState("");
  const [localIp, setLocalIp] = useState<string>("");
  const [networkInterfaces, setNetworkInterfaces] = useState<
    { name: string; ip: string }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"join" | "host">("join");

  // Load initial data
  useEffect(() => {
    const loadNetworkInfo = async () => {
      try {
        const ip = await window.electronAPI.collaboration.getLocalIp();
        setLocalIp(ip);

        const interfaces =
          await window.electronAPI.collaboration.getNetworkInterfaces();
        setNetworkInterfaces(interfaces);
      } catch (err) {
        console.error("Failed to get network info:", err);
      }
    };

    loadNetworkInfo();
  }, []);

  // Load saved username from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("collaborationUserName");
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const handleStartHost = useCallback(async () => {
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }

    setError(null);
    setLoading(true);
    localStorage.setItem("collaborationUserName", userName);

    try {
      // Trigger local network / firewall permission prompt if needed
      const networkOk =
        await window.electronAPI.collaboration.checkLocalNetwork();
      if (!networkOk) {
        setError(
          navigator.platform.startsWith("Mac")
            ? "Local Network permission is required for collaboration. Please allow it in System Settings → Privacy & Security → Local Network, then try again."
            : "Firewall is blocking network access. Please allow this app through Windows Firewall (Settings → Privacy & Security → Windows Security → Firewall), then try again.",
        );
        setLoading(false);
        return;
      }
      await onSessionStart("host", userName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userName, onSessionStart]);

  const handleJoinSession = useCallback(async () => {
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!hostIp.trim()) {
      setError("Please enter the host IP address");
      return;
    }

    setError(null);
    setLoading(true);
    localStorage.setItem("collaborationUserName", userName);

    try {
      // Trigger local network / firewall permission prompt if needed
      const networkOk =
        await window.electronAPI.collaboration.checkLocalNetwork();
      if (!networkOk) {
        setError(
          navigator.platform.startsWith("Mac")
            ? "Local Network permission is required for collaboration. Please allow it in System Settings → Privacy & Security → Local Network, then try again."
            : "Firewall is blocking network access. Please allow this app through Windows Firewall (Settings → Privacy & Security → Windows Security → Firewall), then try again.",
        );
        setLoading(false);
        return;
      }
      await onSessionStart("client", userName, hostIp);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userName, hostIp, onSessionStart]);

  const handleStopSession = useCallback(async () => {
    setLoading(true);
    try {
      await onSessionStop();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onSessionStop]);

  const copyIpToClipboard = useCallback(() => {
    if (localIp) {
      navigator.clipboard.writeText(localIp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [localIp]);

  const isActive = collaborationStatus?.isActive || false;
  const connectedUsers = collaborationStatus?.connectedUsers || [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (activeTab === "join") {
        if (!loading) {
          handleJoinSession();
        }
      } else {
        if (!loading) {
          handleStartHost();
        }
      }
    }
  };

  return (
    <div className="collaboration-panel">
      <div className="collaboration-header">
        <Users size={16} />
        <span>Collaboration</span>
        {isActive && (
          <span className={`status-badge ${collaborationStatus?.mode}`}>
            {collaborationStatus?.mode === "host" ? "Hosting" : "Connected"}
          </span>
        )}
      </div>

      {(error || connectionError) && (
        <div className="collaboration-error">
          <AlertCircle size={14} />
          <span>{error || connectionError}</span>
          {connectionError && onClearConnectionError && (
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}
              onClick={onClearConnectionError}
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}

      {!isActive ? (
        <div className="collaboration-setup">
          <div className="tab-container">
            <button
              className={`tab-btn ${activeTab === "join" ? "active" : ""}`}
              onClick={() => setActiveTab("join")}
            >
              <Users size={14} /> Join Session
            </button>
            <button
              className={`tab-btn ${activeTab === "host" ? "active" : ""}`}
              onClick={() => setActiveTab("host")}
            >
              <Wifi size={14} /> Host Session
            </button>
          </div>

          <div className="setup-content">
            {/* User Name Input */}
            <div className="input-group">
              <label>
                <User size={14} />
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            {activeTab === "join" ? (
              <div className="mode-section join-mode animated-fade-in">
                <p className="mode-description">
                  Connect to a shared session. Enter the host's IP address.
                </p>
                <div className="input-group">
                  <label>
                    <Globe size={14} /> Host IP Address
                  </label>
                  <input
                    type="text"
                    value={hostIp}
                    onChange={(e) => setHostIp(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>
                <button
                  className="action-btn secondary full-width"
                  onClick={handleJoinSession}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  {loading ? "Joining..." : "Join Session"}
                </button>
              </div>
            ) : (
              <div className="mode-section host-mode animated-fade-in">
                <p className="mode-description">
                  Host a session for others to join. Share your IP.
                </p>

                {/* Network Info */}
                <div className="network-info">
                  <div className="info-row">
                    <span>Your IP:</span>
                    <code>{localIp || "Loading..."}</code>
                    <button
                      className="copy-btn"
                      onClick={copyIpToClipboard}
                      title="Copy IP"
                    >
                      {copied ? (
                        <Check size={14} className="success" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                  {networkInterfaces.length > 1 && (
                    <div className="network-list">
                      {networkInterfaces.map((iface, idx) => (
                        <div key={idx} className="network-item">
                          <span className="network-name">{iface.name}:</span>
                          <code>{iface.ip}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="action-btn primary full-width"
                  onClick={handleStartHost}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  {loading ? "Starting..." : "Start Hosting"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="collaboration-active">
          {/* Connection Info */}
          <div className="connection-info">
            <div className="info-row">
              <Wifi size={14} className="connected" />
              <span>
                {collaborationStatus?.mode === "host"
                  ? `Hosting on ${localIp || collaborationStatus.hostIp}`
                  : `Connected to ${collaborationStatus?.hostIp}`}
              </span>
              {collaborationStatus?.mode === "host" && (
                <button
                  className="copy-btn"
                  onClick={copyIpToClipboard}
                  title="Copy IP"
                  style={{ marginLeft: "auto" }}
                >
                  {copied ? (
                    <Check size={14} className="success" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Connected Users */}
          <div className="users-section">
            <h4>
              <Users size={14} />
              Connected Users ({connectedUsers.length})
            </h4>
            <div className="users-list">
              {connectedUsers.map((user) => (
                <div key={user.id} className="user-item">
                  <div
                    className="user-avatar"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-name">{user.name}</span>
                  {user.id === "host" && (
                    <span className="user-badge">Host</span>
                  )}
                  {user.id === "self" && (
                    <span className="user-badge you">You</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stop Button */}
          <button
            className="action-btn danger"
            onClick={handleStopSession}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Square size={14} />
            )}
            {collaborationStatus?.mode === "host"
              ? "Stop Hosting"
              : "Leave Session"}
          </button>
        </div>
      )}
    </div>
  );
}
