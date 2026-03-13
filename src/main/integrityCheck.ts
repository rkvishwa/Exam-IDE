import { app, dialog } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { securityLog } from './securityLog';

function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function verifyAsarIntegrity(isDev: boolean): Promise<boolean> {
  if (isDev) {
    return true;
  }

  const resourcesDir = process.resourcesPath;
  const sealPath = path.join(resourcesDir, 'integrity.seal');
  const asarPath = path.join(resourcesDir, 'app.asar');

  try {
    if (!fs.existsSync(sealPath) || !fs.existsSync(asarPath)) {
      throw new Error('Required integrity artifacts are missing.');
    }

    const expected = fs.readFileSync(sealPath, 'utf8').trim();
    const actual = await sha256File(asarPath);

    if (!expected || expected !== actual) {
      throw new Error('ASAR checksum mismatch.');
    }

    securityLog.append('INTEGRITY_CHECK_PASSED', {
      sealPath,
      asarPath,
    });
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown integrity check error';

    securityLog.append('INTEGRITY_CHECK_FAILED', { reason });
    securityLog.append('TAMPERING_DETECTED', {
      source: 'asar-integrity',
      reason,
    });

    await dialog.showMessageBox({
      type: 'error',
      title: 'Tampering Detected',
      message: 'This installation appears to have been modified.',
      detail: 'Sonar Code Editor cannot continue because its packaged files failed the integrity check.',
    });

    app.quit();
    return false;
  }
}
