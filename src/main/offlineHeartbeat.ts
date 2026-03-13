import { BrowserWindow } from 'electron';
import * as crypto from 'crypto';
import { securityLog } from './securityLog';

const PING_INTERVAL_MS = 5000;
const CHECK_INTERVAL_MS = 10000;
const MAX_MISSES_BEFORE_UNRESPONSIVE = 3;
const STARTUP_GRACE_MS = 20000;

export class OfflineHeartbeatMonitor {
  private browserWindow: BrowserWindow | null = null;
  private nonce = '';
  private startupAt = 0;
  private lastPingAt: number | null = null;
  private missedCount = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  attachWindow(browserWindow: BrowserWindow): void {
    this.browserWindow = browserWindow;
  }

  start(): void {
    this.nonce = crypto.randomBytes(32).toString('hex');
    this.startupAt = Date.now();
    this.lastPingAt = null;
    this.missedCount = 0;

    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      this.checkHeartbeat();
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getNonce(): string {
    if (!this.nonce) {
      this.nonce = crypto.randomBytes(32).toString('hex');
      this.startupAt = Date.now();
    }

    return this.nonce;
  }

  receivePing(receivedNonce: string): void {
    if (!this.nonce || receivedNonce !== this.nonce) {
      return;
    }

    const now = Date.now();
    const previousPingAt = this.lastPingAt;
    this.lastPingAt = now;

    if (this.missedCount > 0 && previousPingAt) {
      securityLog.append('HEARTBEAT_RESUMED', {
        gapMs: now - previousPingAt,
        missedCount: this.missedCount,
      });
    }

    this.missedCount = 0;
  }

  private checkHeartbeat(): void {
    if (!this.browserWindow || this.browserWindow.isDestroyed()) {
      return;
    }

    const now = Date.now();
    const referenceTime = this.lastPingAt ?? this.startupAt;
    const elapsedSinceLastPing = now - referenceTime;

    if (!this.lastPingAt && elapsedSinceLastPing < STARTUP_GRACE_MS) {
      return;
    }

    if (elapsedSinceLastPing <= PING_INTERVAL_MS * 2) {
      return;
    }

    this.missedCount += 1;

    securityLog.append('HEARTBEAT_MISSED', {
      missedCount: this.missedCount,
      elapsedMs: elapsedSinceLastPing,
    });

    if (this.missedCount >= MAX_MISSES_BEFORE_UNRESPONSIVE) {
      securityLog.append('RENDERER_UNRESPONSIVE', {
        elapsedMs: elapsedSinceLastPing,
        missedCount: this.missedCount,
      });
    }
  }
}

export const offlineHeartbeatMonitor = new OfflineHeartbeatMonitor();
