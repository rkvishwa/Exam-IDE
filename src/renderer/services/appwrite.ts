import { Client, Databases, Query, ID, RealtimeResponseEvent } from 'appwrite';
import { APP_CONFIG } from '../../shared/constants';
import { Team, Session, ActivityLog, ActivitySyncData, Report, HeartbeatPayload } from '../../shared/types';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

const DB_ID = import.meta.env.VITE_APPWRITE_DB_NAME || 'devwatch_db';
const COL_TEAMS = import.meta.env.VITE_APPWRITE_COLLECTION_TEAMS || 'teams';
const COL_SESSIONS = import.meta.env.VITE_APPWRITE_COLLECTION_SESSIONS || 'sessions';
const COL_ACTIVITY_LOGS = import.meta.env.VITE_APPWRITE_COLLECTION_ACTIVITY_LOGS || 'activityLogs';
const COL_REPORTS = import.meta.env.VITE_APPWRITE_COLLECTION_REPORTS || 'reports';
const COL_SETTINGS = import.meta.env.VITE_APPWRITE_COLLECTION_SETTINGS || 'settings';

// ---- Teams ----
export async function getTeamByName(teamName: string): Promise<Team | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_TEAMS, [
      Query.limit(500),
    ]);
    const match = res.documents.find(
      (d: any) => d.teamName.toLowerCase() === teamName.toLowerCase()
    );
    if (!match) return null;
    return match as unknown as Team;
  } catch {
    return null;
  }
}

export async function validateTeamCredentials(teamName: string, password: string): Promise<Team | null> {
  const team = await getTeamByName(teamName);
  if (!team) return null;
  if (team.password !== password) return null;
  return team;
}

export async function registerTeam(
  teamName: string,
  password: string,
  studentIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getTeamByName(teamName);
    if (existing) {
      return { success: false, error: 'Team name already exists' };
    }
    await databases.createDocument(DB_ID, COL_TEAMS, ID.unique(), {
      teamName,
      password,
      role: 'team',
      studentIds,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Registration failed' };
  }
}

export async function addTeamMember(
  teamId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await databases.getDocument(DB_ID, COL_TEAMS, teamId);
    const existing: string[] = (res as any).studentIds || [];
    if (existing.length >= 5) {
      return { success: false, error: 'Team already has 5 members' };
    }
    if (existing.includes(studentId)) {
      return { success: false, error: 'Member already exists' };
    }
    await databases.updateDocument(DB_ID, COL_TEAMS, teamId, {
      studentIds: [...existing, studentId],
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add member' };
  }
}

export async function changeTeamPassword(
  teamId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await databases.getDocument(DB_ID, COL_TEAMS, teamId);
    if ((res as any).password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }
    await databases.updateDocument(DB_ID, COL_TEAMS, teamId, {
      password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to change password' };
  }
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    const res = await databases.getDocument(DB_ID, COL_TEAMS, teamId);
    return res as unknown as Team;
  } catch {
    return null;
  }
}

export async function updateTeamName(
  teamId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getTeamByName(newName);
    if (existing && existing.$id !== teamId) {
      return { success: false, error: 'Team name already exists' };
    }
    await databases.updateDocument(DB_ID, COL_TEAMS, teamId, {
      teamName: newName,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update team name' };
  }
}

export async function updateTeamPassword(
  teamId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const team = await getTeamById(teamId);
    if (!team) return { success: false, error: 'Team not found' };
    if (team.password !== oldPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }
    await databases.updateDocument(DB_ID, COL_TEAMS, teamId, {
      password: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password' };
  }
}



// ---- Teams ----
export async function getAdminTeamIds(): Promise<Set<string>> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_TEAMS, [
      Query.equal('role', 'admin'),
      Query.limit(100),
    ]);
    return new Set(res.documents.map((d) => d.$id));
  } catch {
    return new Set();
  }
}

// ---- Sessions ----
export async function upsertSession(teamId: string, teamName: string, status: 'online' | 'offline'): Promise<void> {
  try {
    const existing = await databases.listDocuments(DB_ID, COL_SESSIONS, [
      Query.equal('teamId', teamId),
    ]);
    const data: Omit<Session, '$id'> = {
      teamId,
      teamName,
      status,
      lastSeen: new Date().toISOString(),
    };
    if (existing.documents.length > 0) {
      await databases.updateDocument(DB_ID, COL_SESSIONS, existing.documents[0].$id, data);
    } else {
      await databases.createDocument(DB_ID, COL_SESSIONS, ID.unique(), data);
    }
  } catch (err) {
    console.error('Failed to upsert session:', err);
  }
}

export async function updateSessionLastSeen(teamId: string): Promise<void> {
  const existing = await databases.listDocuments(DB_ID, COL_SESSIONS, [
    Query.equal('teamId', teamId),
  ]);
  if (existing.documents.length > 0) {
    await databases.updateDocument(DB_ID, COL_SESSIONS, existing.documents[0].$id, {
      lastSeen: new Date().toISOString(),
      status: 'online',
    });
  }
}

export async function getAllSessions(): Promise<Session[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SESSIONS, [
      Query.limit(100),
    ]);
    return res.documents as unknown as Session[];
  } catch {
    return [];
  }
}

// ---- Activity Logs (one row per team, upserted) ----

function parseSyncData(doc: ActivityLog): ActivitySyncData {
  try {
    if (doc.windowTitle) return JSON.parse(doc.windowTitle);
  } catch { /* ignore */ }
  return {
    sessionStart: doc.timestamp,
    heartbeatCount: 0,
    apps: {},
    files: [],
    windows: [],
    statusChanges: 0,
    totalOnlineSec: 0,
    totalOfflineSec: 0,
    lastStatus: doc.status,
    lastStatusAt: doc.timestamp,
    offlinePeriods: [],
  };
}

const HEARTBEAT_SEC = APP_CONFIG.HEARTBEAT_INTERVAL_MS / 1000;

export async function upsertActivityLog(payload: HeartbeatPayload): Promise<void> {
  const existing = await databases.listDocuments(DB_ID, COL_ACTIVITY_LOGS, [
    Query.equal('teamId', payload.teamId),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    const doc = existing.documents[0] as unknown as ActivityLog;
    const sync = parseSyncData(doc);

    // Accumulate app usage
    const appKey = payload.appName || payload.currentWindow || 'Unknown';
    sync.apps[appKey] = (sync.apps[appKey] || 0) + HEARTBEAT_SEC;

    // Track unique files and windows
    if (payload.currentFile && !sync.files.includes(payload.currentFile)) {
      sync.files.push(payload.currentFile);
    }
    if (payload.currentWindow && !sync.windows.includes(payload.currentWindow)) {
      sync.windows.push(payload.currentWindow);
    }

    // Track status transitions
    const elapsed = (new Date(payload.timestamp).getTime() - new Date(sync.lastStatusAt).getTime()) / 1000;
    if (sync.lastStatus === 'online') {
      sync.totalOnlineSec += Math.max(0, elapsed);
    } else {
      sync.totalOfflineSec += Math.max(0, elapsed);
    }
    if (payload.status !== sync.lastStatus) {
      sync.statusChanges++;
      if (sync.lastStatus === 'offline') {
        sync.offlinePeriods.push({ from: sync.lastStatusAt, to: payload.timestamp, duration: Math.max(0, elapsed) });
      }
    }
    sync.lastStatus = payload.status;
    sync.lastStatusAt = payload.timestamp;
    sync.heartbeatCount++;

    // Sync activity events from client localStorage
    if (payload.activityEvents && payload.activityEvents.length > 0) {
      sync.activityEvents = payload.activityEvents;
    }

    // Keep offlinePeriods compact (last 20)
    if (sync.offlinePeriods.length > 20) {
      sync.offlinePeriods = sync.offlinePeriods.slice(-20);
    }
    // Keep files/windows compact (last 50 each)
    if (sync.files.length > 50) sync.files = sync.files.slice(-50);
    if (sync.windows.length > 50) sync.windows = sync.windows.slice(-50);

    const updatePayload = {
      currentWindow: payload.currentWindow || '',
      currentFile: payload.currentFile || '',
      status: payload.status,
      timestamp: payload.timestamp,
      appName: payload.appName || '',
      event: 'heartbeat' as const,
    };

    // Progressively trim events to fit within Appwrite field size limits.
    // Try full events first, then halve repeatedly, then remove entirely.
    const writeWithTrim = async () => {
      const attempts = [
        () => JSON.stringify(sync),
        () => { if (sync.activityEvents) sync.activityEvents = sync.activityEvents.slice(-Math.ceil(sync.activityEvents.length / 2)); return JSON.stringify(sync); },
        () => { if (sync.activityEvents) sync.activityEvents = sync.activityEvents.slice(-Math.ceil(sync.activityEvents.length / 2)); return JSON.stringify(sync); },
        () => { if (sync.activityEvents) sync.activityEvents = sync.activityEvents.slice(-20); return JSON.stringify(sync); },
        () => { delete sync.activityEvents; return JSON.stringify(sync); },
      ];
      for (let i = 0; i < attempts.length; i++) {
        const json = attempts[i]();
        try {
          await databases.updateDocument(DB_ID, COL_ACTIVITY_LOGS, doc.$id!, {
            ...updatePayload,
            windowTitle: json,
          });
          return; // success
        } catch (err) {
          if (i === attempts.length - 1) throw err; // last attempt, rethrow
          console.warn(`Activity log update attempt ${i + 1} failed, trimming events...`);
        }
      }
    };
    await writeWithTrim();
  } else {
    // First heartbeat — create a new document
    const sync: ActivitySyncData = {
      sessionStart: payload.timestamp,
      heartbeatCount: 1,
      apps: { [payload.appName || payload.currentWindow || 'Unknown']: HEARTBEAT_SEC },
      files: payload.currentFile ? [payload.currentFile] : [],
      windows: payload.currentWindow ? [payload.currentWindow] : [],
      statusChanges: 0,
      totalOnlineSec: 0,
      totalOfflineSec: 0,
      lastStatus: payload.status,
      lastStatusAt: payload.timestamp,
      offlinePeriods: [],
      activityEvents: payload.activityEvents || [],
    };

    const createPayload = {
      teamId: payload.teamId,
      teamName: payload.teamName,
      currentWindow: payload.currentWindow || '',
      currentFile: payload.currentFile || '',
      status: payload.status,
      timestamp: payload.timestamp,
      event: 'heartbeat',
      appName: payload.appName || '',
    };

    try {
      await databases.createDocument(DB_ID, COL_ACTIVITY_LOGS, ID.unique(), {
        ...createPayload,
        windowTitle: JSON.stringify(sync),
      });
    } catch (err) {
      console.warn('Activity log create failed, retrying without events:', err);
      delete sync.activityEvents;
      await databases.createDocument(DB_ID, COL_ACTIVITY_LOGS, ID.unique(), {
        ...createPayload,
        windowTitle: JSON.stringify(sync),
      });
    }
  }
}

export interface OfflineSyncSummary {
  offlineFrom: string;
  offlineTo: string;
  duration: number;
  logCount: number;
  apps: string[];
  files: string[];
  windows: string[];
  syncedAt: string;
}

export async function mergeOfflineSyncData(
  teamId: string,
  teamName: string,
  summary: OfflineSyncSummary,
): Promise<void> {
  try {
    const existing = await databases.listDocuments(DB_ID, COL_ACTIVITY_LOGS, [
      Query.equal('teamId', teamId),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      const doc = existing.documents[0] as unknown as ActivityLog;
      const sync = parseSyncData(doc);
      sync.totalOfflineSec += summary.duration / 1000;
      sync.offlinePeriods.push({
        from: summary.offlineFrom,
        to: summary.offlineTo,
        duration: summary.duration / 1000,
      });
      if (sync.offlinePeriods.length > 20) {
        sync.offlinePeriods = sync.offlinePeriods.slice(-20);
      }
      for (const app of summary.apps) {
        sync.apps[app] = (sync.apps[app] || 0) + (summary.duration / 1000 / Math.max(summary.apps.length, 1));
      }
      for (const f of summary.files) {
        if (!sync.files.includes(f)) sync.files.push(f);
      }
      for (const w of summary.windows) {
        if (!sync.windows.includes(w)) sync.windows.push(w);
      }
      sync.heartbeatCount += summary.logCount;

      await databases.updateDocument(DB_ID, COL_ACTIVITY_LOGS, doc.$id!, {
        status: 'online',
        timestamp: summary.syncedAt,
        event: 'offline_sync',
        windowTitle: JSON.stringify(sync),
      });
    } else {
      // No existing row; create one with offline sync data
      const sync: ActivitySyncData = {
        sessionStart: summary.offlineFrom,
        heartbeatCount: summary.logCount,
        apps: Object.fromEntries(summary.apps.map((a) => [a, summary.duration / 1000 / Math.max(summary.apps.length, 1)])),
        files: summary.files,
        windows: summary.windows,
        statusChanges: 1,
        totalOnlineSec: 0,
        totalOfflineSec: summary.duration / 1000,
        lastStatus: 'online',
        lastStatusAt: summary.syncedAt,
        offlinePeriods: [{ from: summary.offlineFrom, to: summary.offlineTo, duration: summary.duration / 1000 }],
      };
      await databases.createDocument(DB_ID, COL_ACTIVITY_LOGS, ID.unique(), {
        teamId,
        teamName,
        currentWindow: '',
        currentFile: summary.files[0] || '',
        status: 'online',
        timestamp: summary.syncedAt,
        event: 'offline_sync',
        appName: summary.apps[0] || '',
        windowTitle: JSON.stringify(sync),
      });
    }
  } catch (err) {
    console.error('Failed to merge offline sync data:', err);
  }
}

export { parseSyncData };

export async function getAllTeams(): Promise<Team[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_TEAMS, [
      Query.limit(500),
    ]);
    return res.documents as unknown as Team[];
  } catch {
    return [];
  }
}

export async function getGlobalInternetRestriction(): Promise<boolean> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SETTINGS, [
      Query.equal('settingType', 'blockInternetAccess'),
      Query.limit(1),
    ]);
    if (res.documents.length > 0) {
      return res.documents[0].settingValue === 'true';
    }
    return false;
  } catch {
    return false;
  }
}

export async function setGlobalInternetRestriction(blocked: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SETTINGS, [
      Query.equal('settingType', 'blockInternetAccess'),
      Query.limit(1),
    ]);
    if (res.documents.length > 0) {
      await databases.updateDocument(DB_ID, COL_SETTINGS, res.documents[0].$id, {
        settingValue: String(blocked),
      });
    } else {
      await databases.createDocument(DB_ID, COL_SETTINGS, ID.unique(), {
        settingType: 'blockInternetAccess',
        settingValue: String(blocked),
      });
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update restriction' };
  }
}

export async function flushAllActivityLogs(): Promise<{ success: boolean; error?: string }> {
  try {
    let hasMore = true;
    while (hasMore) {
      const res = await databases.listDocuments(DB_ID, COL_ACTIVITY_LOGS, [
        Query.limit(100),
      ]);
      if (res.documents.length === 0) { hasMore = false; break; }
      for (const doc of res.documents) {
        await databases.deleteDocument(DB_ID, COL_ACTIVITY_LOGS, doc.$id);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to flush activity logs' };
  }
}

export async function getActivityLogForTeam(teamId: string): Promise<ActivityLog | null> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_ACTIVITY_LOGS, [
      Query.equal('teamId', teamId),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) return null;
    return res.documents[0] as unknown as ActivityLog;
  } catch {
    return null;
  }
}

export async function getAllActivityLogs(limit = 100): Promise<ActivityLog[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_ACTIVITY_LOGS, [
      Query.orderDesc('timestamp'),
      Query.limit(limit),
    ]);
    return res.documents as unknown as ActivityLog[];
  } catch {
    return [];
  }
}

// ---- Reports ----
export async function saveReport(report: Omit<Report, '$id'>): Promise<void> {
  try {
    await databases.createDocument(DB_ID, COL_REPORTS, ID.unique(), report);
  } catch (err) {
    console.error('Failed to save report:', err);
  }
}

export async function getReportsForTeam(teamId: string): Promise<Report[]> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_REPORTS, [
      Query.equal('teamId', teamId),
      Query.orderDesc('generatedAt'),
    ]);
    return res.documents as unknown as Report[];
  } catch {
    return [];
  }
}

// ---- Realtime ----
export function subscribeToActivityLogs(callback: (log: ActivityLog) => void): () => void {
  const unsub = client.subscribe(
    `databases.${DB_ID}.collections.${COL_ACTIVITY_LOGS}.documents`,
    (response: RealtimeResponseEvent<ActivityLog>) => {
      if (response.events.some((e) => e.includes('create') || e.includes('update'))) {
        callback(response.payload);
      }
    }
  );
  return unsub;
}

export function subscribeToActivityLogDeletes(callback: () => void): () => void {
  const unsub = client.subscribe(
    `databases.${DB_ID}.collections.${COL_ACTIVITY_LOGS}.documents`,
    (response: RealtimeResponseEvent<ActivityLog>) => {
      if (response.events.some((e) => e.includes('delete'))) {
        callback();
      }
    }
  );
  return unsub;
}

export function subscribeToSessions(callback: (session: Session) => void): () => void {
  const unsub = client.subscribe(
    `databases.${DB_ID}.collections.${COL_SESSIONS}.documents`,
    (response: RealtimeResponseEvent<Session>) => {
      if (response.events.some((e) => e.includes('create') || e.includes('update'))) {
        callback(response.payload);
      }
    }
  );
  return unsub;
}

export function subscribeToSettings(callback: (blocked: boolean) => void): () => void {
  const unsub = client.subscribe(
    `databases.${DB_ID}.collections.${COL_SETTINGS}.documents`,
    (response: RealtimeResponseEvent<any>) => {
      if (response.events.some((e) => e.includes('update') || e.includes('create'))) {
        const payload = response.payload;
        if (payload.settingType === 'blockInternetAccess') {
          callback(payload.settingValue === 'true');
        }
      }
    }
  );
  return unsub;
}

export { client, databases };

// ---- Editor Feature Toggles ----

import { EditorFeatureToggles, DEFAULT_FEATURE_TOGGLES } from '../../shared/types';

export async function getEditorFeatureToggles(): Promise<EditorFeatureToggles> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SETTINGS, [
      Query.limit(500),
    ]);
    const toggles = { ...DEFAULT_FEATURE_TOGGLES };
    res.documents.forEach((doc: any) => {
      if (doc.settingType in toggles) {
        (toggles as any)[doc.settingType] = doc.settingValue === 'true';
      }
    });
    return toggles;
  } catch {
    return { ...DEFAULT_FEATURE_TOGGLES };
  }
}

export async function saveEditorFeatureToggles(toggles: EditorFeatureToggles): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SETTINGS, [
      Query.limit(500),
    ]);
    const existingDocs = new Map(res.documents.map((d: any) => [d.settingType, d]));

    const promises = Object.entries(toggles).map(async ([key, value]) => {
      const stringVal = String(value); // "true" or "false"
      const existing = existingDocs.get(key);
      
      if (existing) {
        if (existing.settingValue !== stringVal) {
          return databases.updateDocument(DB_ID, COL_SETTINGS, existing.$id, {
            settingValue: stringVal,
          });
        }
      } else {
        return databases.createDocument(DB_ID, COL_SETTINGS, ID.unique(), {
          settingType: key,
          settingValue: stringVal,
        });
      }
    });

    await Promise.all(promises);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save feature toggles' };
  }
}

export function subscribeToEditorFeatures(callback: (key: keyof EditorFeatureToggles, value: boolean) => void): () => void {
  const unsub = client.subscribe(
    `databases.${DB_ID}.collections.${COL_SETTINGS}.documents`,
    (response: RealtimeResponseEvent<any>) => {
      if (response.events.some((e) => e.includes('create') || e.includes('update'))) {
        const type = response.payload.settingType;
        if (type in DEFAULT_FEATURE_TOGGLES) {
          callback(type as keyof EditorFeatureToggles, response.payload.settingValue === 'true');
        }
      }
    }
  );
  return unsub;
}
