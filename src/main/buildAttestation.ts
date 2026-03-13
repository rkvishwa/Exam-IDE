import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AttestationData } from '../shared/types';
import { securityLog } from './securityLog';

interface BuildAttestationPayload extends AttestationData {}

let cachedAttestation: AttestationData | null = null;
let loggedStatus = false;

function getAttestationFilePath(): string {
  return path.join(__dirname, '..', 'build-attestation.json');
}

function logAttestationStatus(token: string): void {
  if (loggedStatus) {
    return;
  }

  loggedStatus = true;

  if (token === 'DEV_MODE') {
    securityLog.append('DEV_MODE_CLIENT', {
      packaged: app.isPackaged,
    });
    return;
  }

  securityLog.append('BUILD_ATTESTED', {
    packaged: app.isPackaged,
  });
}

export function getAttestationData(): AttestationData {
  if (cachedAttestation) {
    return cachedAttestation;
  }

  if (!app.isPackaged) {
    cachedAttestation = {
      token: 'DEV_MODE',
      version: app.getVersion(),
      buildTimestamp: 'DEV_MODE',
      label: 'DEV_MODE',
    };
    logAttestationStatus(cachedAttestation.token);
    return cachedAttestation;
  }

  try {
    const attestationPath = getAttestationFilePath();
    const raw = fs.readFileSync(attestationPath, 'utf8');
    const parsed = JSON.parse(raw) as BuildAttestationPayload;

    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.version !== 'string' ||
      typeof parsed.buildTimestamp !== 'string' ||
      parsed.label !== 'OFFICIAL_BUILD'
    ) {
      throw new Error('Invalid attestation payload.');
    }

    cachedAttestation = parsed;
  } catch {
    cachedAttestation = {
      token: 'DEV_MODE',
      version: app.getVersion(),
      buildTimestamp: 'DEV_MODE',
      label: 'DEV_MODE',
    };
  }

  logAttestationStatus(cachedAttestation.token);
  return cachedAttestation;
}

export function getAttestationToken(): string {
  return getAttestationData().token;
}
