import { app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type SecurityEventName =
  | 'APP_STARTED'
  | 'APP_QUIT'
  | 'BUILD_ATTESTED'
  | 'DEV_MODE_CLIENT'
  | 'DEVTOOLS_OPENED'
  | 'HEARTBEAT_MISSED'
  | 'HEARTBEAT_RESUMED'
  | 'INTEGRITY_CHECK_FAILED'
  | 'INTEGRITY_CHECK_PASSED'
  | 'RENDERER_UNRESPONSIVE'
  | 'TAMPERING_DETECTED'
  | 'UNATTESTED_CLIENT_BLOCKED';

export interface SecurityLogEntry {
  seq: number;
  timestamp: string;
  event: SecurityEventName;
  details: Record<string, unknown>;
  hmac: string;
}

class SecurityLogService {
  private logPath = '';
  private machineSecret = '';
  private entries: SecurityLogEntry[] = [];

  initialize(): void {
    this.logPath = path.join(app.getPath('userData'), 'security-log.json');
    this.machineSecret = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          host: os.hostname(),
          platform: process.platform,
          arch: process.arch,
          userData: app.getPath('userData'),
        })
      )
      .digest('hex');

    if (!fs.existsSync(this.logPath)) {
      this.persist();
      return;
    }

    try {
      const raw = fs.readFileSync(this.logPath, 'utf8');
      const parsed = JSON.parse(raw) as SecurityLogEntry[];

      if (!Array.isArray(parsed) || !this.isChainValid(parsed)) {
        this.rotateCorruptLog();
        this.entries = [];
        this.append('TAMPERING_DETECTED', {
          reason: 'Security log integrity validation failed',
        });
        return;
      }

      this.entries = parsed;
    } catch {
      this.rotateCorruptLog();
      this.entries = [];
      this.append('TAMPERING_DETECTED', {
        reason: 'Security log could not be parsed',
      });
    }
  }

  append(event: SecurityEventName, details: Record<string, unknown> = {}): SecurityLogEntry {
    const seq = this.entries.length + 1;
    const timestamp = new Date().toISOString();
    const prevHmac = this.entries[this.entries.length - 1]?.hmac ?? '';
    const hmac = this.createHmac(seq, timestamp, event, details, prevHmac);

    const entry: SecurityLogEntry = {
      seq,
      timestamp,
      event,
      details,
      hmac,
    };

    this.entries.push(entry);
    this.persist();
    return entry;
  }

  getEntries(): SecurityLogEntry[] {
    return [...this.entries];
  }

  private createHmac(
    seq: number,
    timestamp: string,
    event: SecurityEventName,
    details: Record<string, unknown>,
    prevHmac: string
  ): string {
    return crypto
      .createHmac('sha256', this.machineSecret)
      .update(
        [
          seq,
          timestamp,
          event,
          JSON.stringify(details),
          prevHmac,
        ].join('|')
      )
      .digest('hex');
  }

  private isChainValid(entries: SecurityLogEntry[]): boolean {
    let prevHmac = '';

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const expectedSeq = index + 1;
      const computed = this.createHmac(
        expectedSeq,
        entry.timestamp,
        entry.event,
        entry.details ?? {},
        prevHmac
      );

      if (entry.seq !== expectedSeq || entry.hmac !== computed) {
        return false;
      }

      prevHmac = entry.hmac;
    }

    return true;
  }

  private rotateCorruptLog(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        const corruptPath = this.logPath.replace(/\.json$/, `.corrupt-${Date.now()}.json`);
        fs.renameSync(this.logPath, corruptPath);
      }
    } catch {
      // Ignore rotation failures and continue with a clean log.
    }
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    fs.writeFileSync(this.logPath, `${JSON.stringify(this.entries, null, 2)}\n`, 'utf8');
  }
}

export const securityLog = new SecurityLogService();
