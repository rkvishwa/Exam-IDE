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
  onSessionStart: (mode: "host" | "client", hostIp?: string) => void;
  onSessionStop: () => void;
  collaborationStatus: CollaborationStatus | null;
}

export default function CollaborationPanel({
  onSessionStart,
  onSessionStop,
  collaborationStatus,
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
      await onSessionStart("host");
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
      await onSessionStart("client", hostIp);
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

      {error && (
        <div className="collaboration-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {!isActive ? (
        <div className="collaboration-setup">
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
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {/* Network Info */}
          <div className="network-info">
            <div className="info-row">
              <Globe size={14} />
              <span>Your IP: </span>
              <code>{localIp || "Loading..."}</code>
              <button
                className="copy-btn"
                onClick={copyIpToClipboard}
                title="Copy IP"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
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

          {/* Host Mode */}
          <div className="mode-section">
            <h4>
              <Wifi size={14} />
              Start as Host
            </h4>
            <p className="mode-description">
              Others can connect to your session using your IP address.
            </p>
            <button
              className="action-btn primary"
              onClick={handleStartHost}
              disabled={loading || !userName.trim()}
            >
              {loading ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Play size={14} />
              )}
              Start Hosting
            </button>
          </div>

          {/* Client Mode */}
          <div className="mode-section">
            <h4>
              <WifiOff size={14} />
              Join Session
            </h4>
            <p className="mode-description">
              Connect to another host's IP address.
            </p>
            <div className="input-group">
              <input
                type="text"
                value={hostIp}
                onChange={(e) => setHostIp(e.target.value)}
                placeholder="Host IP (e.g., 192.168.1.100)"
              />
            </div>
            <button
              className="action-btn secondary"
              onClick={handleJoinSession}
              disabled={loading || !userName.trim() || !hostIp.trim()}
            >
              {loading ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Play size={14} />
              )}
              Join Session
            </button>
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
                  ? `Hosting on ${collaborationStatus.hostIp}:${collaborationStatus.port}`
                  : `Connected to ${collaborationStatus?.hostIp}:${collaborationStatus?.port}`}
              </span>
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
