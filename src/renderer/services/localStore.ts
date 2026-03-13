// Wrapper around localStorage for renderer-side persistence.
const QUEUE_KEY = 'sonar_offline_queue';

// Offline queue
export interface QueuedLog {
  type: 'activityLog' | 'session';
  payload: unknown;
  queuedAt: string;
}

export function enqueueLog(log: QueuedLog): void {
  const queue = getQueue();
  queue.push(log);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): QueuedLog[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
