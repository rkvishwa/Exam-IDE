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

function computeRiskScore(data: ReportData): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  if (data.summary.percentInIDE < 60) {
    score += 25;
    flags.push(`Low IDE focus: ${data.summary.percentInIDE}%`);
  } else if (data.summary.percentInIDE < 80) {
    score += 10;
  }

  if (data.summary.percentOnline < 70) {
    score += 20;
    flags.push(`Low uptime: ${data.summary.percentOnline}%`);
  }

  if (data.summary.disconnections > 5) {
    score += 15;
    flags.push(`Frequent disconnections: ${data.summary.disconnections}`);
  } else if (data.summary.disconnections > 2) {
    score += 5;
  }

  if (data.summary.appSwitches > 20) {
    score += 20;
    flags.push(`Excessive app switching: ${data.summary.appSwitches}`);
  } else if (data.summary.appSwitches > 10) {
    score += 10;
  }

  const suspiciousApps = data.appUsage.filter((a) =>
    a.appName !== 'DevWatch IDE' && SUSPICIOUS_APPS.some((s) => a.appName.toLowerCase().includes(s))
  );
  if (suspiciousApps.length > 0) {
    score += 20;
    flags.push(`Suspicious apps: ${suspiciousApps.map((a) => a.appName).join(', ')}`);
  }

  score = Math.min(100, score);
  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  return { score, level, flags };
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

type TabKey = 'summary' | 'timeline' | 'apps' | 'risk';

export default function ReportModal({ team, onClose }: ReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  useEffect(() => {
    getActivityLogForTeam(team.teamId || team.$id!).then((log) => {
      if (log) {
        const sync = parseSyncData(log);
        setReportData(buildReportData(team, sync));
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

  const risk = reportData ? computeRiskScore(reportData) : null;

  const tabConfig: { key: TabKey; label: string; icon: string }[] = [
    { key: 'summary', label: 'Summary', icon: '\u2630' },
    { key: 'risk', label: 'Risk', icon: '\u26A0' },
    { key: 'timeline', label: 'Timeline', icon: '\u23F1' },
    { key: 'apps', label: 'Apps', icon: '\u2699' },
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
                        { label: 'Uptime', value: reportData.summary.percentOnline, threshold: 70, unit: '%' },
                        { label: 'Disconnections', value: reportData.summary.disconnections, threshold: 5, unit: '', invert: true },
                        { label: 'App Switches', value: reportData.summary.appSwitches, threshold: 20, unit: '', invert: true },
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

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div>
                  <div className="timeline-bar-container">
                    {reportData.statusTimeline.map((entry, i) => {
                      const pct = reportData.summary.totalDuration > 0
                        ? (entry.duration / reportData.summary.totalDuration) * 100
                        : 0;
                      return (
                        <div
                          key={i}
                          className={`timeline-segment ${entry.status}`}
                          style={{ flexBasis: `${pct}%` }}
                          title={`${entry.status}: ${formatDuration(entry.duration)}`}
                        />
                      );
                    })}
                  </div>
                  <table className="report-table">
                    <thead>
                      <tr><th>Status</th><th>From</th><th>To</th><th>Duration</th></tr>
                    </thead>
                    <tbody>
                      {reportData.statusTimeline.map((entry, i) => (
                        <tr key={i} className={`status-row-${entry.status}`}>
                          <td>
                            <span className={`status-badge ${entry.status}`}>
                              <span className={`status-dot ${entry.status}`} />
                              {entry.status}
                            </span>
                          </td>
                          <td>{formatTime(entry.from)}</td>
                          <td>{formatTime(entry.to)}</td>
                          <td>{formatDuration(entry.duration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Apps Tab */}
              {activeTab === 'apps' && (
                <div>
                  {/* App usage visual */}
                  <div className="app-usage-visual">
                    {reportData.appUsage.slice(0, 8).map((entry) => {
                      const maxTime = reportData.appUsage[0]?.totalTime || 1;
                      const pct = (entry.totalTime / maxTime) * 100;
                      const isIDE = entry.appName === 'DevWatch IDE';
                      const isSuspicious = SUSPICIOUS_APPS.some((s) => entry.appName.toLowerCase().includes(s));
                      return (
                        <div key={entry.appName} className="app-usage-bar-row">
                          <span className={`app-usage-name ${isSuspicious ? 'suspicious' : ''}`}>{entry.appName}</span>
                          <div className="app-usage-bar-track">
                            <div className={`app-usage-bar-fill ${isIDE ? 'ide' : isSuspicious ? 'suspicious' : 'other'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="app-usage-time">{formatDuration(entry.totalTime)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <table className="report-table">
                    <thead>
                      <tr><th>App</th><th>Window Title</th><th>First Seen</th><th>Last Seen</th><th>Total Time</th><th>Flag</th></tr>
                    </thead>
                    <tbody>
                      {reportData.appUsage.map((entry, i) => {
                        const isNonIDE = entry.appName !== 'DevWatch IDE';
                        const isSuspicious = SUSPICIOUS_APPS.some((s) => entry.appName.toLowerCase().includes(s));
                        return (
                          <tr key={i} className={isSuspicious ? 'flagged-row' : isNonIDE ? 'flagged-row-light' : ''}>
                            <td className="td-app-name">{entry.appName}</td>
                            <td className="td-window">{entry.windowTitle || '\u2014'}</td>
                            <td>{formatTime(entry.firstSeen)}</td>
                            <td>{formatTime(entry.lastSeen)}</td>
                            <td>{formatDuration(entry.totalTime)}</td>
                            <td>
                              {isSuspicious ? <span className="flag-badge danger">{'\u26A0'} Suspicious</span>
                                : isNonIDE ? <span className="flag-badge warn">Non-IDE</span> : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
