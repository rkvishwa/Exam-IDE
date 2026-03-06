import React, { useState, useEffect } from 'react';
import { Team, ActivityLog, ActivitySyncData, StatusEntry, AppUsageEntry, ReportData } from '../../../shared/types';
import { getActivityLogForTeam, parseSyncData, saveReport } from '../../services/appwrite';
import { generatePDFReport } from '../../services/reportGenerator';
import { APP_CONFIG } from '../../../shared/constants';
import './ReportModal.css';

interface ReportModalProps {
  team: Team & { teamId: string };
  onClose: () => void;
}

const SUSPICIOUS_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'telegram', 'whatsapp', 'discord', 'slack', 'chatgpt', 'copilot', 'notion', 'word', 'docs'];

function buildReportData(team: Team & { teamId: string }, sync: ActivitySyncData): ReportData {
  const emptyReport: ReportData = {
    team,
    sessionStart: '',
    sessionEnd: '',
    statusTimeline: [],
    appUsage: [],
    summary: { totalDuration: 0, totalOnlineTime: 0, totalOfflineTime: 0, disconnections: 0, longestOnlineStretch: 0, percentOnline: 0, percentInIDE: 0, appSwitches: 0 }
  };

  if (!sync || sync.heartbeatCount === 0) return emptyReport;

  const sessionStart = sync.sessionStart;
  const sessionEnd = sync.lastStatusAt;
  const totalDuration = sync.totalOnlineSec + sync.totalOfflineSec;

  // Build status timeline from offline periods
  const statusTimeline: StatusEntry[] = [];
  let longestOnline = 0;
  let prevEnd = sessionStart;

  const sortedOffline = [...sync.offlinePeriods].sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
  for (const period of sortedOffline) {
    // Online period before this offline period
    const onlineDur = (new Date(period.from).getTime() - new Date(prevEnd).getTime()) / 1000;
    if (onlineDur > 0) {
      statusTimeline.push({ status: 'online', from: prevEnd, to: period.from, duration: onlineDur });
      if (onlineDur > longestOnline) longestOnline = onlineDur;
    }
    statusTimeline.push({ status: 'offline', from: period.from, to: period.to, duration: period.duration });
    prevEnd = period.to;
  }
  // Final online stretch
  const finalOnline = (new Date(sessionEnd).getTime() - new Date(prevEnd).getTime()) / 1000;
  if (finalOnline > 0) {
    statusTimeline.push({ status: 'online', from: prevEnd, to: sessionEnd, duration: finalOnline });
    if (finalOnline > longestOnline) longestOnline = finalOnline;
  }
  if (statusTimeline.length === 0 && totalDuration > 0) {
    statusTimeline.push({ status: 'online', from: sessionStart, to: sessionEnd, duration: totalDuration });
    longestOnline = totalDuration;
  }

  // Build app usage from sync.apps
  const appUsage: AppUsageEntry[] = Object.entries(sync.apps)
    .map(([appName, totalSec]) => ({
      appName,
      windowTitle: appName,
      firstSeen: sessionStart,
      lastSeen: sessionEnd,
      totalTime: totalSec,
    }))
    .sort((a, b) => b.totalTime - a.totalTime);

  const ideTime = appUsage.filter((a) => a.appName === 'DevWatch IDE').reduce((acc, a) => acc + a.totalTime, 0);
  const disconnections = sync.offlinePeriods.length;
  const appSwitches = Object.keys(sync.apps).length > 1 ? sync.heartbeatCount : 0;

  return {
    team,
    sessionStart,
    sessionEnd,
    statusTimeline,
    appUsage,
    summary: {
      totalDuration,
      totalOnlineTime: sync.totalOnlineSec,
      totalOfflineTime: sync.totalOfflineSec,
      disconnections,
      longestOnlineStretch: longestOnline,
      percentOnline: totalDuration > 0 ? Math.round((sync.totalOnlineSec / totalDuration) * 100) : 0,
      percentInIDE: sync.totalOnlineSec > 0 ? Math.round((ideTime / sync.totalOnlineSec) * 100) : 0,
      appSwitches,
    }
  };
}

function computeRiskScore(data: ReportData, events: Array<{ type: string; timestamp: string; details?: string }> = []): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; flags: string[]; onlineCount: number; extPasteCount: number; appBlurCount: number } {
  const flags: string[] = [];
  let score = 0;

  // Count event types
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
  const onlineCount = counts['status_online'] || 0;
  const extPasteCount = counts['clipboard_paste_external'] || 0;
  const appBlurCount = counts['app_blur'] || 0;

  // IDE focus
  if (data.summary.percentInIDE < 60) {
    score += 20;
    flags.push(`Low IDE focus: ${data.summary.percentInIDE}%`);
  } else if (data.summary.percentInIDE < 80) {
    score += 10;
  }

  // Going online (exam should be offline)
  if (onlineCount > 5) {
    score += 25;
    flags.push(`Went online ${onlineCount} times — exam should be offline`);
  } else if (onlineCount > 2) {
    score += 15;
    flags.push(`Went online ${onlineCount} times`);
  } else if (onlineCount > 0) {
    score += 8;
    flags.push(`Went online ${onlineCount} time${onlineCount > 1 ? 's' : ''}`);
  }

  // App switches (any switch away from IDE is risky)
  if (appBlurCount > 15) {
    score += 25;
    flags.push(`Excessive app switching: ${appBlurCount} times`);
  } else if (appBlurCount > 5) {
    score += 15;
    flags.push(`Frequent app switching: ${appBlurCount} times`);
  } else if (appBlurCount > 0) {
    score += 8;
    flags.push(`Switched away from IDE ${appBlurCount} time${appBlurCount > 1 ? 's' : ''}`);
  }

  // External paste (major red flag)
  if (extPasteCount > 5) {
    score += 25;
    flags.push(`Heavy external pasting: ${extPasteCount} times`);
  } else if (extPasteCount > 2) {
    score += 15;
    flags.push(`External paste detected: ${extPasteCount} times`);
  } else if (extPasteCount > 0) {
    score += 10;
    flags.push(`External paste detected: ${extPasteCount} time${extPasteCount > 1 ? 's' : ''}`);
  }

  // Non-IDE apps
  const nonIdeApps = data.appUsage.filter((a) => a.appName !== 'DevWatch IDE');
  if (nonIdeApps.length > 0) {
    score += Math.min(15, nonIdeApps.length * 5);
    flags.push(`Non-IDE apps: ${nonIdeApps.map((a) => a.appName).join(', ')}`);
  }

  score = Math.min(100, score);
  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  return { score, level, flags, onlineCount, extPasteCount, appBlurCount };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleTimeString();
}

function formatEventType(type: string, details?: string): string {
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
    default: return type;
  }
}

type TabKey = 'summary' | 'insights' | 'risk' | 'activityLog';

interface Insight {
  icon: string;
  title: string;
  value: string;
  detail: string;
  color?: string;
  severity?: 'good' | 'warn' | 'bad';
}

function computeInsights(
  data: ReportData,
  events: Array<{ type: string; timestamp: string; details?: string }>
): { cards: Insight[]; patterns: Array<{ label: string; severity: 'good' | 'warn' | 'bad' }> ; hourlyActivity: number[]; clipboardItems: Array<{ time: string; text: string; type: string }>; eventBreakdown: Array<{ type: string; label: string; count: number; severity: 'good' | 'warn' | 'bad'; icon: string }> } {
  const cards: Insight[] = [];
  const patterns: Array<{ label: string; severity: 'good' | 'warn' | 'bad' }> = [];
  const hourlyActivity = new Array(24).fill(0);
  const clipboardItems: Array<{ time: string; text: string; type: string }> = [];

  // Count events by type
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    const h = new Date(e.timestamp).getHours();
    if (!isNaN(h)) hourlyActivity[h]++;
  }

  // ---- Focus Score ----
  const idePercent = data.summary.percentInIDE;
  const blurCount = counts['app_blur'] || 0;
  const focusCount = counts['app_focus'] || 0;
  const focusScore = Math.max(0, Math.min(100, Math.round(
    idePercent * 0.6 + Math.max(0, 100 - blurCount * 3) * 0.4
  )));
  cards.push({
    icon: '\u{1F3AF}',
    title: 'Focus Score',
    value: `${focusScore}%`,
    detail: `IDE usage ${idePercent}%, switched away ${blurCount} time${blurCount !== 1 ? 's' : ''}`,
    severity: focusScore >= 70 ? 'good' : focusScore >= 40 ? 'warn' : 'bad',
  });

  // ---- Clipboard Activity ----
  const copies = counts['clipboard_copy'] || 0;
  const extPastes = counts['clipboard_paste_external'] || 0;
  const totalClipboard = copies + extPastes;
  for (const e of events) {
    if (e.type === 'clipboard_copy' || e.type === 'clipboard_paste_external') {
      clipboardItems.push({
        time: new Date(e.timestamp).toLocaleTimeString(),
        text: e.details || '\u2014',
        type: e.type === 'clipboard_copy' ? 'Copy' : 'External Paste',
      });
    }
  }
  cards.push({
    icon: '\u{1F4CB}',
    title: 'Clipboard Activity',
    value: `${totalClipboard}`,
    detail: `${copies} copies, ${extPastes} external paste${extPastes !== 1 ? 's' : ''}`,
    severity: extPastes > 3 ? 'bad' : extPastes > 0 ? 'warn' : 'good',
  });

  // ---- Top Distraction (any non-IDE app switch is a flag) ----
  const appSwitches: Record<string, number> = {};
  for (const e of events) {
    if (e.type === 'app_blur' && e.details) {
      const match = e.details.match(/^(?:Switched to|Active app):\s*(.+)$/i);
      if (match) {
        const parts = match[1].trim().split(' - ');
        const appName = parts[parts.length - 1].trim();
        if (appName) appSwitches[appName] = (appSwitches[appName] || 0) + 1;
      }
    }
  }
  const sortedApps = Object.entries(appSwitches).sort((a, b) => b[1] - a[1]);
  if (sortedApps.length > 0) {
    const [topApp, topCount] = sortedApps[0];
    cards.push({
      icon: '\u{1F4F1}',
      title: 'Top Distraction',
      value: topApp.length > 18 ? topApp.substring(0, 16) + '\u2026' : topApp,
      detail: `Switched to ${topCount} time${topCount !== 1 ? 's' : ''} \u26A0 Left IDE`,
      severity: topCount > 5 ? 'bad' : 'warn',
    });
  }

  // ---- Network Activity (exam should be offline, online = risk) ----
  const offlineEvents = counts['status_offline'] || 0;
  const onlineEvents = counts['status_online'] || 0;
  const disconnects = data.summary.disconnections;
  cards.push({
    icon: '\u{1F4E1}',
    title: 'Network Activity',
    value: onlineEvents === 0 ? 'Offline' : `${onlineEvents} online`,
    detail: onlineEvents > 0
      ? `Went online ${onlineEvents} time${onlineEvents !== 1 ? 's' : ''} \u26A0 Exam should be offline`
      : 'Stayed offline throughout \u2014 expected for exam',
    severity: onlineEvents > 3 ? 'bad' : onlineEvents > 0 ? 'warn' : 'good',
  });

  // ---- Session Duration ----
  cards.push({
    icon: '\u23F1',
    title: 'Session Duration',
    value: formatDuration(data.summary.totalDuration),
    detail: `Online ${formatDuration(data.summary.totalOnlineTime)}, Offline ${formatDuration(data.summary.totalOfflineTime)}`,
  });

  // ---- App Diversity (any non-IDE app is flagged) ----
  const appCount = data.appUsage.length;
  const nonIdeApps = data.appUsage.filter(a => a.appName !== 'DevWatch IDE');
  cards.push({
    icon: '\u{1F4BB}',
    title: 'Apps Detected',
    value: `${appCount}`,
    detail: nonIdeApps.length > 0
      ? `${nonIdeApps.length} non-IDE: ${nonIdeApps.map(a => a.appName).join(', ')}` 
      : 'Only IDE used — clean session',
    severity: nonIdeApps.length > 2 ? 'bad' : nonIdeApps.length > 0 ? 'warn' : 'good',
  });

  // ---- Behavioral Patterns ----
  if (idePercent >= 85) patterns.push({ label: 'High IDE focus — good exam discipline', severity: 'good' });
  if (idePercent < 50) patterns.push({ label: 'Very low IDE focus — spent most time outside IDE', severity: 'bad' });
  if (extPastes > 3) patterns.push({ label: `Frequent external pastes (${extPastes}) — possible content copying`, severity: 'bad' });
  else if (extPastes > 0) patterns.push({ label: `${extPastes} external paste${extPastes > 1 ? 's' : ''} detected`, severity: 'warn' });
  if (blurCount > 0) patterns.push({ label: `Switched away from IDE ${blurCount} time${blurCount !== 1 ? 's' : ''} — any switch is flagged`, severity: blurCount > 10 ? 'bad' : 'warn' });
  if (onlineEvents === 0) patterns.push({ label: 'Stayed offline throughout \u2014 expected for exam', severity: 'good' });
  if (onlineEvents > 0) patterns.push({ label: `Went online ${onlineEvents} time${onlineEvents !== 1 ? 's' : ''} \u2014 exam should be offline`, severity: onlineEvents > 3 ? 'bad' : 'warn' });
  if (nonIdeApps.length > 0) patterns.push({ label: `Non-IDE apps used: ${nonIdeApps.map(a => a.appName).join(', ')}`, severity: 'bad' });
  if (sortedApps.length > 0) {
    for (const [app, cnt] of sortedApps.slice(0, 3)) {
      patterns.push({ label: `Switched to "${app}" ${cnt} time${cnt !== 1 ? 's' : ''}`, severity: cnt > 5 ? 'bad' : 'warn' });
    }
  }
  if (copies > 10) patterns.push({ label: `High clipboard copy activity (${copies})`, severity: 'warn' });
  else if (copies > 0) patterns.push({ label: `${copies} clipboard cop${copies > 1 ? 'ies' : 'y'}`, severity: 'warn' });
  if (events.length === 0) patterns.push({ label: 'No activity events synced', severity: 'warn' });

  // ---- Event Type Breakdown ----
  const eventTypeConfig: Record<string, { label: string; icon: string; severity: (n: number) => 'good' | 'warn' | 'bad' }> = {
    'status_online': { label: 'Went Online', icon: '\u26A0', severity: (n) => n > 3 ? 'bad' : n > 0 ? 'warn' : 'good' },
    'status_offline': { label: 'Went Offline', icon: '\u{1F7E2}', severity: () => 'good' },
    'app_focus': { label: 'Returned to IDE', icon: '\u{1F4A0}', severity: () => 'good' },
    'app_blur': { label: 'Switched Away', icon: '\u26A0', severity: (n) => n > 10 ? 'bad' : n > 0 ? 'warn' : 'good' },
    'clipboard_copy': { label: 'Clipboard Copy', icon: '\u{1F4C4}', severity: (n) => n > 10 ? 'warn' : 'good' },
    'clipboard_paste_external': { label: 'External Paste', icon: '\u{1F4E5}', severity: (n) => n > 3 ? 'bad' : n > 0 ? 'warn' : 'good' },
  };

  const eventBreakdown: Array<{ type: string; label: string; count: number; severity: 'good' | 'warn' | 'bad'; icon: string }> = [];
  for (const [type, cfg] of Object.entries(eventTypeConfig)) {
    const count = counts[type] || 0;
    eventBreakdown.push({ type, label: cfg.label, count, severity: cfg.severity(count), icon: cfg.icon });
  }
  // Add any unknown types from events
  for (const [type, count] of Object.entries(counts)) {
    if (!eventTypeConfig[type]) {
      eventBreakdown.push({ type, label: type, count, severity: 'warn', icon: '\u2753' });
    }
  }

  return { cards, patterns, hourlyActivity, clipboardItems, eventBreakdown };
}

export default function ReportModal({ team, onClose }: ReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [activityEvents, setActivityEvents] = useState<Array<{ type: string; timestamp: string; details?: string }>>([]);

  useEffect(() => {
    getActivityLogForTeam(team.teamId || team.$id!).then((log) => {
      if (log) {
        const sync = parseSyncData(log);
        setReportData(buildReportData(team, sync));
        if (sync.activityEvents && sync.activityEvents.length > 0) {
          setActivityEvents(sync.activityEvents);
        }
      } else {
        setReportData(buildReportData(team, {
          sessionStart: '', heartbeatCount: 0, apps: {}, files: [], windows: [],
          statusChanges: 0, totalOnlineSec: 0, totalOfflineSec: 0, lastStatus: 'offline', lastStatusAt: '', offlinePeriods: [],
        }));
      }
      setLoading(false);
    });
  }, [team]);

  const handleExportPDF = async () => {
    if (!reportData) return;
    await generatePDFReport(reportData);
  };

  const handleExportJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${team.teamName}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToAppwrite = async () => {
    if (!reportData) return;
    await saveReport({
      teamId: team.teamId || team.$id!,
      teamName: team.teamName,
      sessionStart: reportData.sessionStart,
      sessionEnd: reportData.sessionEnd,
      generatedAt: new Date().toISOString(),
      reportData: JSON.stringify(reportData),
    });
    alert('Report saved to Appwrite!');
  };

  const risk = reportData ? computeRiskScore(reportData, activityEvents) : null;

  const insights = reportData ? computeInsights(reportData, activityEvents) : null;

  const tabConfig: { key: TabKey; label: string; icon: string }[] = [
    { key: 'summary', label: 'Summary', icon: '\u2630' },
    { key: 'insights', label: 'Insights', icon: '\u{1F4A1}' },
    { key: 'risk', label: 'Risk', icon: '\u26A0' },
    { key: 'activityLog', label: 'Activity Log', icon: '\u{1F4CB}' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-team-avatar">
              {team.teamName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>Report &mdash; {team.teamName}</h2>
              {reportData?.sessionStart && (
                <p className="modal-subtitle">
                  {new Date(reportData.sessionStart).toLocaleDateString()} &nbsp;
                  {formatTime(reportData.sessionStart)} &rarr; {formatTime(reportData.sessionEnd)}
                </p>
              )}
            </div>
          </div>
          <div className="modal-actions">
            {risk && (
              <span className={`risk-indicator ${risk.level.toLowerCase()}`}>
                {risk.level} RISK
              </span>
            )}
            <button className="admin-btn" onClick={handleExportPDF}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              PDF
            </button>
            <button className="admin-btn" onClick={handleExportJSON}>JSON</button>
            <button className="admin-btn" onClick={handleSaveToAppwrite}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              Save
            </button>
            <button className="modal-close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="loading-spinner" />
            Loading activity data...
          </div>
        ) : !reportData || !reportData.sessionStart ? (
          <div className="modal-empty">No activity data found for this team.</div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="modal-tabs">
              {tabConfig.map((tab) => (
                <button
                  key={tab.key}
                  className={`modal-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="summary-section">
                  <div className="summary-grid">
                    {[
                      { label: 'Total Session', value: formatDuration(reportData.summary.totalDuration), icon: '\u23F0' },
                      { label: 'Online Time', value: formatDuration(reportData.summary.totalOnlineTime), color: 'var(--online)', icon: '\u2705' },
                      { label: 'Offline Time', value: formatDuration(reportData.summary.totalOfflineTime), color: 'var(--offline)', icon: '\u274C' },
                      { label: '% Online', value: `${reportData.summary.percentOnline}%`, color: reportData.summary.percentOnline >= 80 ? 'var(--online)' : reportData.summary.percentOnline >= 50 ? 'var(--warning)' : 'var(--offline)', icon: '\u2B06' },
                      { label: '% In IDE', value: `${reportData.summary.percentInIDE}%`, color: reportData.summary.percentInIDE >= 80 ? 'var(--online)' : reportData.summary.percentInIDE >= 50 ? 'var(--warning)' : 'var(--offline)', icon: '\u2328' },
                      { label: 'Disconnections', value: reportData.summary.disconnections, color: reportData.summary.disconnections > 5 ? 'var(--offline)' : undefined, icon: '\u26A1' },
                      { label: 'App Switches', value: reportData.summary.appSwitches, color: reportData.summary.appSwitches > 20 ? 'var(--warning)' : undefined, icon: '\u21C4' },
                      { label: 'Longest Online', value: formatDuration(reportData.summary.longestOnlineStretch), icon: '\u2B50' },
                    ].map((item) => (
                      <div key={item.label} className="summary-card">
                        <span className="summary-icon">{item.icon}</span>
                        <span className="summary-value" style={item.color ? { color: item.color } : undefined}>{item.value}</span>
                        <span className="summary-label">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick visual bars */}
                  <div className="summary-bars">
                    <div className="summary-bar-row">
                      <span className="bar-label">Online %</span>
                      <div className="summary-bar-track">
                        <div className="summary-bar-fill online" style={{ width: `${reportData.summary.percentOnline}%` }} />
                      </div>
                      <span className="bar-value">{reportData.summary.percentOnline}%</span>
                    </div>
                    <div className="summary-bar-row">
                      <span className="bar-label">IDE Focus</span>
                      <div className="summary-bar-track">
                        <div className="summary-bar-fill accent" style={{ width: `${reportData.summary.percentInIDE}%` }} />
                      </div>
                      <span className="bar-value">{reportData.summary.percentInIDE}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Tab */}
              {activeTab === 'risk' && risk && (
                <div className="risk-section">
                  <div className="risk-score-card">
                    <div className={`risk-score-circle ${risk.level.toLowerCase()}`}>
                      <span className="risk-score-value">{risk.score}</span>
                      <span className="risk-score-label">/ 100</span>
                    </div>
                    <div className="risk-score-info">
                      <span className={`risk-level-badge ${risk.level.toLowerCase()}`}>
                        {risk.level} RISK
                      </span>
                      <p className="risk-description">
                        {risk.level === 'LOW' && 'This team shows normal exam behavior with no significant red flags.'}
                        {risk.level === 'MEDIUM' && 'Some activity patterns warrant attention. Review the flagged items below.'}
                        {risk.level === 'HIGH' && 'Multiple concerning patterns detected. Immediate review recommended.'}
                      </p>
                    </div>
                  </div>

                  {risk.flags.length > 0 && (
                    <div className="risk-flags">
                      <h4 className="risk-flags-title">Flagged Issues</h4>
                      {risk.flags.map((flag, i) => (
                        <div key={i} className="risk-flag-item">
                          <span className="risk-flag-icon">{'\u26A0'}</span>
                          <span className="risk-flag-text">{flag}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="risk-breakdown">
                    <h4 className="risk-flags-title">Risk Factors</h4>
                    <div className="risk-factor-grid">
                      {[
                        { label: 'IDE Focus', value: reportData.summary.percentInIDE, threshold: 80, unit: '%' },
                        { label: 'Went Online', value: risk.onlineCount, threshold: 0, unit: '', invert: true },
                        { label: 'App Switches', value: risk.appBlurCount, threshold: 0, unit: '', invert: true },
                        { label: 'External Pastes', value: risk.extPasteCount, threshold: 0, unit: '', invert: true },
                      ].map((factor) => {
                        const isGood = factor.invert ? factor.value <= factor.threshold : factor.value >= factor.threshold;
                        return (
                          <div key={factor.label} className={`risk-factor ${isGood ? 'good' : 'bad'}`}>
                            <div className="risk-factor-header">
                              <span>{factor.label}</span>
                              <span className="risk-factor-value">{factor.value}{factor.unit}</span>
                            </div>
                            <div className="risk-factor-bar">
                              <div
                                className={`risk-factor-bar-fill ${isGood ? 'good' : 'bad'}`}
                                style={{ width: `${Math.min(100, factor.invert ? (factor.value / (factor.threshold * 2)) * 100 : factor.value)}%` }}
                              />
                            </div>
                            <span className="risk-factor-threshold">
                              {factor.invert ? `Threshold: \u2264 ${factor.threshold}` : `Threshold: \u2265 ${factor.threshold}${factor.unit}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && insights && (
                <div className="insights-section">
                  {/* Insight Cards */}
                  <div className="insights-grid">
                    {insights.cards.map((card, i) => (
                      <div key={i} className={`insight-card ${card.severity || ''}`}>
                        <div className="insight-card-icon">{card.icon}</div>
                        <div className="insight-card-body">
                          <span className="insight-card-title">{card.title}</span>
                          <span className="insight-card-value">{card.value}</span>
                          <span className="insight-card-detail">{card.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hourly Activity */}
                  {insights.hourlyActivity.some(v => v > 0) && (
                    <div className="insights-panel">
                      <h4 className="insights-panel-title">{'\u{1F551}'} Activity by Hour</h4>
                      <div className="hourly-chart">
                        {insights.hourlyActivity.map((count, hour) => {
                          const max = Math.max(...insights.hourlyActivity, 1);
                          const pct = (count / max) * 100;
                          return (
                            <div key={hour} className="hourly-bar-col" title={`${hour}:00 — ${count} events`}>
                              <div className="hourly-bar-track">
                                <div
                                  className={`hourly-bar-fill ${count > 0 ? 'active' : ''}`}
                                  style={{ height: `${pct}%` }}
                                />
                              </div>
                              <span className="hourly-label">{hour}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Event Type Breakdown */}
                  {insights.eventBreakdown.length > 0 && (
                    <div className="insights-panel">
                      <h4 className="insights-panel-title">{'\u{1F3F7}'} Event Breakdown</h4>
                      <div className="event-breakdown-grid">
                        {insights.eventBreakdown.map((eb) => (
                          <div key={eb.type} className={`event-breakdown-item ${eb.severity}`}>
                            <span className="event-breakdown-icon">{eb.icon}</span>
                            <span className="event-breakdown-count">{eb.count}</span>
                            <span className="event-breakdown-label">{eb.label}</span>
                            <span className={`event-breakdown-tag ${eb.severity}`}>{eb.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Behavioral Patterns */}
                  {insights.patterns.length > 0 && (
                    <div className="insights-panel">
                      <h4 className="insights-panel-title">{'\u{1F9E0}'} Behavioral Patterns</h4>
                      <div className="pattern-list">
                        {insights.patterns.map((p, i) => (
                          <div key={i} className={`pattern-item ${p.severity}`}>
                            <span className="pattern-dot" />
                            <span>{p.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clipboard Details */}
                  {insights.clipboardItems.length > 0 && (
                    <div className="insights-panel">
                      <h4 className="insights-panel-title">{'\u{1F4CB}'} Clipboard Events</h4>
                      <div className="clipboard-table">
                        <div className="clipboard-header">
                          <span>Time</span>
                          <span>Type</span>
                          <span>Content</span>
                        </div>
                        {insights.clipboardItems.map((item, i) => (
                          <div key={i} className={`clipboard-row ${item.type === 'External Paste' ? 'external' : ''}`}>
                            <span className="clipboard-time">{item.time}</span>
                            <span className={`clipboard-type ${item.type === 'External Paste' ? 'paste' : 'copy'}`}>{item.type}</span>
                            <span className="clipboard-text" title={item.text}>
                              {item.text.length > 70 ? item.text.substring(0, 70) + '\u2026' : item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Distractions breakdown */}
                  {(() => {
                    const appSwitches: Record<string, number> = {};
                    for (const e of activityEvents) {
                      if (e.type === 'app_blur' && e.details) {
                        const match = e.details.match(/^(?:Switched to|Active app):\s*(.+)$/i);
                        if (match) {
                          const parts = match[1].trim().split(' - ');
                          const appName = parts[parts.length - 1].trim();
                          if (appName) appSwitches[appName] = (appSwitches[appName] || 0) + 1;
                        }
                      }
                    }
                    const sorted = Object.entries(appSwitches).sort((a, b) => b[1] - a[1]).slice(0, 6);
                    if (sorted.length === 0) return null;
                    const maxVal = sorted[0][1];
                    return (
                      <div className="insights-panel">
                        <h4 className="insights-panel-title">{'\u{1F4F1}'} Switch-to Apps</h4>
                        <div className="distraction-bars">
                          {sorted.map(([app, count]) => (
                            <div key={app} className="distraction-bar-row">
                              <span className="distraction-name suspicious">{app}</span>
                              <div className="distraction-track">
                                <div
                                  className="distraction-fill suspicious"
                                  style={{ width: `${(count / maxVal) * 100}%` }}
                                />
                              </div>
                              <span className="distraction-count">{count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Activity Log Tab */}
              {activeTab === 'activityLog' && (
                <div className="activity-log-section">
                  <div className="activity-log-description">
                    User activity tracked in the background — online/offline status changes, app switching, and clipboard events with timestamps.
                  </div>
                  <div className="activity-log-actions">
                    <span className="activity-log-count">{activityEvents.length} events recorded</span>
                  </div>
                  {activityEvents.length > 0 ? (
                    <div className="activity-log-preview">
                      <div className="activity-log-table">
                        <div className="activity-log-header">
                          <span>Time</span>
                          <span>Event</span>
                          <span>Details</span>
                        </div>
                        {[...activityEvents].reverse().map((event, idx) => (
                          <div className="activity-log-row" key={idx}>
                            <span className="activity-log-time">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`activity-log-type activity-log-type--${event.type}`}>
                              {formatEventType(event.type, event.details)}
                            </span>
                            <span className="activity-log-details" title={event.details || ''}>
                              {event.details
                                ? event.details.length > 60
                                  ? event.details.substring(0, 60) + '\u2026'
                                  : event.details
                                : '\u2014'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="modal-empty">No activity events synced for this user.</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
