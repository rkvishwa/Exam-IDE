import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ActivityEvent {
  type: 'status_online' | 'status_offline' | 'app_focus' | 'app_blur' | 'clipboard_copy' | 'clipboard_paste_external';
  timestamp: string;
  details?: string;
}

const ACTIVITY_LOG_KEY = 'sonar_activity_log';
const MAX_LOG_ENTRIES = 5000;

export function getActivityLog(): ActivityEvent[] {
  const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addActivityEvent(event: ActivityEvent): void {
  const log = getActivityLog();
  log.push(event);
  // Keep only the last MAX_LOG_ENTRIES to prevent localStorage bloat
  if (log.length > MAX_LOG_ENTRIES) {
    log.splice(0, log.length - MAX_LOG_ENTRIES);
  }
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log));
}

export function clearActivityLog(): void {
  localStorage.removeItem(ACTIVITY_LOG_KEY);
}

function extractAppName(details?: string): string | null {
  if (!details) return null;
  const match = details.match(/^(?:Switched to|Active app):\s*(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  // Window titles are like "Tab Title - Section - App Name", extract last segment
  const parts = raw.split(' - ');
  return parts[parts.length - 1].trim() || raw;
}

function formatEventType(type: ActivityEvent['type'], details?: string): string {
  switch (type) {
    case 'status_online': return 'Went Online';
    case 'status_offline': return 'Went Offline';
    case 'app_focus': return 'Returned to IDE';
    case 'app_blur': {
      const app = extractAppName(details);
      return app ? `Switched To ${app}` : 'Switched Away';
    }
    case 'clipboard_copy': return 'Clipboard Copy';
    case 'clipboard_paste_external': return 'External Paste';
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export async function generateActivityLogPDF(teamName: string): Promise<void> {
  const log = getActivityLog();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const attestationToken = await window.electronAPI?.security?.getAttestationToken?.();
  const isOfficialBuild = !!attestationToken && attestationToken !== 'DEV_MODE';

  // --- Colors ---
  const C = {
    primary: [24, 119, 242] as [number, number, number],
    dark: [17, 24, 39] as [number, number, number],
    darkGray: [55, 65, 81] as [number, number, number],
    midGray: [107, 114, 128] as [number, number, number],
    lightGray: [229, 231, 235] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
    orange: [245, 158, 11] as [number, number, number],
    purple: [139, 92, 246] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  const SUSPICIOUS_APPS = [
    'chrome', 'firefox', 'edge', 'safari', 'opera', 'brave', 'vivaldi', 'browser',
    'whatsapp', 'telegram', 'discord', 'slack', 'teams', 'messenger', 'signal',
    'chatgpt', 'copilot', 'claude', 'bard', 'gemini', 'perplexity',
    'notepad', 'word', 'docs', 'notion',
  ];

  const isSuspicious = (name: string) => SUSPICIOUS_APPS.some(s => name.toLowerCase().includes(s));

  const fmtDur = (ms: number): string => {
    if (ms < 1000) return '<1s';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getTableY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const ensureSpace = (y: number, need: number) => {
    if (y + need > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); return 20; }
    return y;
  };

  const drawSection = (y: number, title: string, color = C.primary) => {
    doc.setFillColor(...color);
    doc.rect(margin, y, 3, 6, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(title, margin + 6, y + 5);
    return y + 10;
  };

  const drawCard = (x: number, y: number, w: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, w, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, w, 22, 2, 2, 'S');
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(value, x + w / 2, y + 10, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.midGray);
    doc.text(label, x + w / 2, y + 17, { align: 'center' });
  };

  // ========== HEADER ==========
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(...C.primary);
  doc.rect(0, 28, pageW, 2, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EXAM INTEGRITY REPORT', margin, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 210);
  doc.text('Sonar Code Editor — Activity Monitoring System', margin, 22);

  let y = 38;

  if (!isOfficialBuild) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(211, 47, 47);
    doc.text('WARNING: UNOFFICIAL BUILD / DEV MODE', margin, 32);
  }

  const dateRaw = new Date();
  const dateStr = `${dateRaw.getFullYear()}-${String(dateRaw.getMonth()+1).padStart(2,'0')}-${String(dateRaw.getDate()).padStart(2,'0')}`;
  const timeStr = `${String(dateRaw.getHours()).padStart(2,'0')}-${String(dateRaw.getMinutes()).padStart(2,'0')}-${String(dateRaw.getSeconds()).padStart(2,'0')}`;
  const fileName = `ActivityLog-${teamName}-${dateStr}-${timeStr}.pdf`;

  if (log.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...C.midGray);
    doc.text('No activity events were recorded during this session.', margin, y);
    addPdfFooters(doc, C);
    doc.save(fileName);
    return;
  }

  // ========= ANALYSIS =========
  const sorted = [...log].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const sessionStart = sorted[0].timestamp;
  const sessionEnd = sorted[sorted.length - 1].timestamp;
  const sessionMs = new Date(sessionEnd).getTime() - new Date(sessionStart).getTime();

  // Time outside IDE
  let timeOutside = 0, longestAbsence = 0, longestAbsenceApp = '';
  let lastBlurT: number | null = null, lastBlurApp = '';
  for (const e of sorted) {
    const t = new Date(e.timestamp).getTime();
    if (e.type === 'app_blur') { lastBlurT = t; lastBlurApp = extractAppName(e.details) || 'Unknown'; }
    else if (e.type === 'app_focus' && lastBlurT !== null) {
      const away = t - lastBlurT;
      timeOutside += away;
      if (away > longestAbsence) { longestAbsence = away; longestAbsenceApp = lastBlurApp; }
      lastBlurT = null;
    }
  }
  if (lastBlurT !== null) {
    const away = new Date(sessionEnd).getTime() - lastBlurT;
    timeOutside += away;
    if (away > longestAbsence) { longestAbsence = away; longestAbsenceApp = lastBlurApp; }
  }
  const timeInIDE = Math.max(0, sessionMs - timeOutside);
  const pctInIDE = sessionMs > 0 ? (timeInIDE / sessionMs) * 100 : 100;

  // Online periods
  const onlinePeriods: { start: string; end: string; ms: number }[] = [];
  let onStart: string | null = null;
  let onCount = 0, totalOnMs = 0;
  for (const e of sorted) {
    if (e.type === 'status_online') { onCount++; onStart = e.timestamp; }
    else if (e.type === 'status_offline' && onStart) {
      const d = new Date(e.timestamp).getTime() - new Date(onStart).getTime();
      onlinePeriods.push({ start: onStart, end: e.timestamp, ms: d });
      totalOnMs += d; onStart = null;
    }
  }
  if (onStart) { const d = new Date(sessionEnd).getTime() - new Date(onStart).getTime(); onlinePeriods.push({ start: onStart, end: sessionEnd, ms: d }); totalOnMs += d; }

  // App usage
  const appMap = new Map<string, { count: number; ms: number }>();
  let curApp = '', switchT = 0;
  for (const e of sorted.filter(e => e.type === 'app_blur' || e.type === 'app_focus')) {
    const t = new Date(e.timestamp).getTime();
    if (e.type === 'app_blur') { curApp = extractAppName(e.details) || 'Unknown'; switchT = t; }
    else if (e.type === 'app_focus' && curApp && switchT) {
      const ex = appMap.get(curApp) || { count: 0, ms: 0 };
      ex.count++; ex.ms += t - switchT;
      appMap.set(curApp, ex); curApp = '';
    }
  }
  const appUsage = Array.from(appMap.entries())
    .map(([app, d]) => ({ app, ...d, flagged: isSuspicious(app) }))
    .sort((a, b) => b.ms - a.ms);

  const switchCount = sorted.filter(e => e.type === 'app_blur').length;
  const copyCount = sorted.filter(e => e.type === 'clipboard_copy').length;
  const extPasteCount = sorted.filter(e => e.type === 'clipboard_paste_external').length;
  const suspSwitches = appUsage.filter(a => a.flagged).reduce((s, a) => s + a.count, 0);

  // Clipboard bursts (copies within 10s of each other)
  const copyTs = sorted.filter(e => e.type === 'clipboard_copy').map(e => new Date(e.timestamp).getTime());
  let bursts = 0;
  for (let i = 1; i < copyTs.length; i++) { if (copyTs[i] - copyTs[i - 1] < 10000) bursts++; }

  // Risk scoring
  const flags: string[] = [];
  let risk = 0;
  if (suspSwitches > 0) { risk += Math.min(25, suspSwitches * 5); flags.push(`Opened browser/messenger/AI tool ${suspSwitches} time(s)`); }
  if (pctInIDE < 70) { risk += 20; flags.push(`Only ${pctInIDE.toFixed(0)}% of session in IDE`); }
  else if (pctInIDE < 85) { risk += 10; flags.push(`${pctInIDE.toFixed(0)}% of session in IDE (below 85%)`); }
  if (switchCount > 20) { risk += 15; flags.push(`${switchCount} app switches (excessive)`); }
  else if (switchCount > 10) { risk += 8; flags.push(`${switchCount} app switches`); }
  if (bursts > 3) { risk += 15; flags.push(`${bursts} rapid clipboard bursts`); }
  else if (bursts > 0) { risk += 5; flags.push(`${bursts} rapid clipboard burst(s)`); }
  if (extPasteCount > 0) { risk += Math.min(20, extPasteCount * 8); flags.push(`${extPasteCount} external paste(s) into IDE`); }
  if (onCount > 0) { risk += 25; flags.push(`Connected to Internet ${onCount} time(s)`); }
  if (longestAbsence > 120000) { risk += 15; flags.push(`Longest absence: ${fmtDur(longestAbsence)} in "${longestAbsenceApp}"`); }
  else if (longestAbsence > 60000) { risk += 8; flags.push(`Longest absence: ${fmtDur(longestAbsence)}`); }
  if (copyCount > 15) { risk += 10; flags.push(`${copyCount} clipboard copies (high)`); }
  risk = Math.min(100, risk);
  const riskLevel = risk >= 50 ? 'HIGH' : risk >= 25 ? 'MEDIUM' : 'LOW';
  if (flags.length === 0) flags.push('No suspicious activity detected');

  // ========== METADATA ==========
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.darkGray);
  doc.text('Student / Team:', margin, y);
  doc.setFont('helvetica', 'bold'); doc.text(teamName, margin + 32, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.text('Session:', margin, y);
  doc.setFont('helvetica', 'bold'); doc.text(`${formatTimestamp(sessionStart)}  →  ${formatTimestamp(sessionEnd)}`, margin + 32, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.text('Duration:', margin, y);
  doc.setFont('helvetica', 'bold'); doc.text(fmtDur(sessionMs), margin + 32, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.text('Generated:', margin, y);
  doc.setFont('helvetica', 'bold'); doc.text(new Date().toLocaleString(), margin + 32, y); y += 12;

  // ========== RISK CARD ==========
  const riskColor = riskLevel === 'HIGH' ? C.red : riskLevel === 'MEDIUM' ? C.orange : C.green;
  const riskBg: [number, number, number] = riskLevel === 'HIGH' ? [254, 242, 242] : riskLevel === 'MEDIUM' ? [255, 251, 235] : [236, 253, 245];

  const maxFlags = Math.min(flags.length, 6);
  const extraFlags = flags.length > maxFlags ? 1 : 0;
  const boxHeight = Math.max(34, 18 + (maxFlags + extraFlags) * 5.5);

  doc.setFillColor(...riskBg);
  doc.roundedRect(margin, y, contentW, boxHeight, 3, 3, 'F');
  doc.setDrawColor(...riskColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, boxHeight, 3, 3, 'S');

  // Badge
  doc.setFillColor(...riskColor);
  doc.roundedRect(margin + 5, y + 5, 28, 9, 2, 2, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(riskLevel, margin + 19, y + 11.5, { align: 'center' });

  // Score
  doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...riskColor);
  doc.text(`${risk}`, margin + 16, y + 26, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(...C.midGray);
  doc.text('/ 100', margin + 25, y + 26);

  // Title + flags
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.dark);
  doc.text('Integrity Risk Assessment', margin + 40, y + 10);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.darkGray);
  for (let i = 0; i < maxFlags; i++) {
    const icon = riskLevel === 'LOW' ? '[OK]' : '[!]';
    doc.text(`${icon}  ${flags[i]}`, margin + 40, y + 16.5 + i * 5.5);
  }
  if (flags.length > maxFlags) doc.text(`  ... and ${flags.length - maxFlags} more flag(s)`, margin + 40, y + 16.5 + maxFlags * 5.5);
  y += boxHeight + 8;

  // ========== METRIC CARDS ==========
  y = ensureSpace(y, 28);
  const cW = (contentW - 16) / 5;
  drawCard(margin, y, cW, 'Time in IDE', `${pctInIDE.toFixed(0)}%`, pctInIDE >= 85 ? C.green : C.orange);
  drawCard(margin + cW + 4, y, cW, 'App Switches', String(switchCount), switchCount > 15 ? C.red : C.dark);
  drawCard(margin + (cW + 4) * 2, y, cW, 'Clipboard Copies', String(copyCount), copyCount > 15 ? C.red : C.dark);
  drawCard(margin + (cW + 4) * 3, y, cW, 'External Copies', String(extPasteCount), extPasteCount > 0 ? C.red : C.dark);
  drawCard(margin + (cW + 4) * 4, y, cW, 'Internet Connections', String(onCount), onCount > 0 ? C.red : C.dark);
  y += 26;

  // ========== TIME BREAKDOWN ==========
  y = ensureSpace(y, 20);
  y = drawSection(y, 'Time Breakdown');
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total Session Duration', fmtDur(sessionMs)],
      ['Time Inside IDE', `${fmtDur(timeInIDE)} (${pctInIDE.toFixed(1)}%)`],
      ['Time Outside IDE', `${fmtDur(timeOutside)} (${(100 - pctInIDE).toFixed(1)}%)`],
      ['Total Online Duration', fmtDur(totalOnMs)],
      ['Longest Single Absence', longestAbsence > 0 ? `${fmtDur(longestAbsence)} — ${longestAbsenceApp}` : 'None'],
    ],
    theme: 'plain',
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3, lineColor: C.lightGray, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });
  y = getTableY() + 10;

  // ========== APP USAGE ==========
  if (appUsage.length > 0) {
    y = ensureSpace(y, 30);
    y = drawSection(y, 'Application Usage (Outside IDE)');
    autoTable(doc, {
      startY: y,
      head: [['Application', 'Switches', 'Total Time', '% of Exam', 'Status']],
      body: appUsage.map(a => [
        a.flagged ? `[!] ${a.app}` : a.app,
        String(a.count),
        fmtDur(a.ms),
        sessionMs > 0 ? `${((a.ms / sessionMs) * 100).toFixed(1)}%` : '0%',
        a.flagged ? 'FLAGGED' : '—',
      ]),
      theme: 'plain',
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3, lineColor: C.lightGray, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 55 }, 4: { cellWidth: 22, halign: 'center' } },
      didParseCell: (data) => {
        if (data.column.index === 4 && data.section === 'body' && data.cell.raw === 'FLAGGED') {
          data.cell.styles.textColor = C.red; data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 0 && data.section === 'body' && (data.cell.raw as string).startsWith('[!]')) {
          data.cell.styles.textColor = C.orange;
        }
      },
      margin: { left: margin, right: margin },
    });
    y = getTableY() + 10;
  }

  // ========== ONLINE PERIODS ==========
  if (onlinePeriods.length > 0) {
    y = ensureSpace(y, 25);
    y = drawSection(y, 'Internet Connections (Offline Working Expected)', C.red);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Went Online', 'Went Offline', 'Duration']],
      body: onlinePeriods.map((p, i) => [String(i + 1), formatTimestamp(p.start), formatTimestamp(p.end), fmtDur(p.ms)]),
      theme: 'plain',
      headStyles: { fillColor: C.red, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3, lineColor: C.lightGray, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
      margin: { left: margin, right: margin },
    });
    y = getTableY() + 10;
  }

  // ========== EXTERNAL PASTES ==========
  const extPasteEvents = sorted.filter(e => e.type === 'clipboard_paste_external');
  if (extPasteEvents.length > 0) {
    y = ensureSpace(y, 25);
    y = drawSection(y, `External Pastes (${extPasteEvents.length}) — Copied outside, pasted in IDE`, C.red);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Time', 'Pasted Content']],
      body: extPasteEvents.map((e, i) => {
        const d = e.details || '—';
        return [String(i + 1), fmtTime(e.timestamp), d.length > 100 ? d.substring(0, 100) + '…' : d];
      }),
      theme: 'plain',
      headStyles: { fillColor: C.red, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: C.lightGray, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 28 } },
      margin: { left: margin, right: margin },
    });
    y = getTableY() + 10;
  }

  // ========== CLIPBOARD ==========
  const clipEvents = sorted.filter(e => e.type === 'clipboard_copy');
  if (clipEvents.length > 0) {
    y = ensureSpace(y, 25);
    y = drawSection(y, `Clipboard Activity (${clipEvents.length} copies)`, C.purple);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Time', 'Copied Content']],
      body: clipEvents.map((e, i) => {
        const d = e.details || '—';
        return [String(i + 1), fmtTime(e.timestamp), d.length > 100 ? d.substring(0, 100) + '…' : d];
      }),
      theme: 'plain',
      headStyles: { fillColor: C.purple, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: C.lightGray, lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [245, 243, 255] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 28 } },
      margin: { left: margin, right: margin },
    });
    y = getTableY() + 10;
  }

  // ========== COMPLETE TIMELINE ==========
  y = ensureSpace(y, 20);
  y = drawSection(y, 'Complete Activity Timeline');
  autoTable(doc, {
    startY: y,
    head: [['Time', 'Event', 'Details']],
    body: sorted.map(e => {
      const d = e.details || '—';
      return [fmtTime(e.timestamp), formatEventType(e.type, e.details), d.length > 90 ? d.substring(0, 90) + '…' : d];
    }),
    theme: 'plain',
    headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: C.lightGray, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 38 } },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const v = data.cell.raw as string;
        if (v === 'Went Online') data.cell.styles.textColor = C.red;
        else if (v === 'Went Offline') data.cell.styles.textColor = C.green;
        else if (v === 'Returned to IDE') data.cell.styles.textColor = C.primary;
        else if (v.startsWith('Switched To')) data.cell.styles.textColor = C.orange;
        else if (v === 'Clipboard Copy') data.cell.styles.textColor = C.purple;
        else if (v === 'External Paste') data.cell.styles.textColor = C.red;
      }
    },
    margin: { left: margin, right: margin },
  });

  addPdfFooters(doc, C);
  doc.save(fileName);
}

function addPdfFooters(doc: jsPDF, C: { lightGray: [number, number, number]; midGray: [number, number, number] }): void {
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.lightGray);
    doc.setLineWidth(0.3);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.midGray);
    doc.text('Sonar Code Editor — Exam Integrity Report', 14, pageH - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 7, { align: 'right' });
  }
}
