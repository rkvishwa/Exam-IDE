import { useEffect, useRef } from 'react';
import { Team } from '../../shared/types';
import { upsertActivityLog, updateSessionLastSeen, mergeOfflineSyncData, OfflineSyncSummary, subscribeToActivityLogDeletes } from '../services/appwrite';
import { enqueueLog, getQueue, clearQueue, QueuedLog } from '../services/localStore';
import { getActivityLog, clearActivityLog } from '../services/activityLogger';
import { HeartbeatPayload } from '../../shared/types';

export function useMonitoring(user: Team | null, isOnline: boolean, currentFile: string) {
  const currentFileRef = useRef(currentFile);

  useEffect(() => {
    currentFileRef.current = currentFile;
    if (window.electronAPI?.monitoring) {
      window.electronAPI.monitoring.setCurrentFile(currentFile);
    }
  }, [currentFile]);

  useEffect(() => {
    if (!user) return;

    // Start monitoring
    if (window.electronAPI?.monitoring) {
      window.electronAPI.monitoring.start(user.teamName, user.$id!);
    }

    // Listen to heartbeats from main process
    const eventsAPI = (window as unknown as { electronEvents?: { onHeartbeat: (cb: (p: HeartbeatPayload) => void) => void; onFlushQueue: (cb: (q: HeartbeatPayload[]) => void) => void; removeAllListeners: (ch: string) => void } }).electronEvents;

    if (eventsAPI) {
      eventsAPI.onHeartbeat(async (payload: HeartbeatPayload) => {
        // Attach local activity events from localStorage
        // Events are stored compactly to fit within Appwrite's windowTitle field
        try {
          const localEvents = getActivityLog();
          if (localEvents.length > 0) {
            payload.activityEvents = localEvents.map(e => ({
              type: e.type,
              timestamp: e.timestamp,
              ...(e.details ? { details: e.details.substring(0, 80) } : {}),
            }));
          }
        } catch (err) {
          console.warn('Failed to attach activity events to heartbeat:', err);
        }
        // Upsert single activity log row + update session
        const logResult = upsertActivityLog(payload).catch(() => 'failed');
        const sessionResult = updateSessionLastSeen(payload.teamId).catch(() => 'failed');
        const [logStatus, sessionStatus] = await Promise.all([logResult, sessionResult]);
        if (logStatus === 'failed' && sessionStatus === 'failed') {
          enqueueLog({ type: 'activityLog', payload, queuedAt: new Date().toISOString() });
        }
      });

      eventsAPI.onFlushQueue(async (queue: HeartbeatPayload[]) => {
        // On flush, just upsert each payload (they merge into the single row)
        for (const item of queue) {
          await upsertActivityLog(item).catch(() => {});
        }
      });
    }

    return () => {
      if (eventsAPI) {
        eventsAPI.removeAllListeners('monitoring:heartbeat');
        eventsAPI.removeAllListeners('monitoring:flushQueue');
      }
      if (window.electronAPI?.monitoring) {
        window.electronAPI.monitoring.stop();
      }
    };
  }, [user]);

  // Subscribe to activity log deletes (admin flush) and clear local logs
  useEffect(() => {
    if (!user?.$id) return;
    const unsub = subscribeToActivityLogDeletes(() => {
      clearActivityLog();
    });
    return unsub;
  }, [user]);

  // Flush offline queue on reconnect — merge into single activity log row
  useEffect(() => {
    if (!isOnline || !user) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    const activityItems = queue.filter((q: QueuedLog) => q.type === 'activityLog');
    if (activityItems.length === 0) { clearQueue(); return; }

    (async () => {
      const payloads = activityItems.map((q) => q.payload as HeartbeatPayload);
      const timestamps = payloads.map((p) => new Date(p.timestamp).getTime());
      const apps = new Set<string>();
      const files = new Set<string>();
      const windows = new Set<string>();
      for (const p of payloads) {
        if (p.appName) apps.add(p.appName);
        if (p.currentFile) files.add(p.currentFile);
        if (p.currentWindow) windows.add(p.currentWindow);
      }

      const summary: OfflineSyncSummary = {
        offlineFrom: new Date(Math.min(...timestamps)).toISOString(),
        offlineTo: new Date(Math.max(...timestamps)).toISOString(),
        duration: Math.max(...timestamps) - Math.min(...timestamps),
        logCount: payloads.length,
        apps: Array.from(apps),
        files: Array.from(files),
        windows: Array.from(windows),
        syncedAt: new Date().toISOString(),
      };

      await mergeOfflineSyncData(user.$id!, user.teamName, summary).catch(() => {});
      await updateSessionLastSeen(user.$id!).catch(() => {});
      clearQueue();
    })();
  }, [isOnline, user]);
}
