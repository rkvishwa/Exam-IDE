import { app, BrowserWindow, ipcMain, dialog, session, protocol, Menu, net, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });
import { execSync } from 'child_process';
import { registerFsHandlers } from './ipcHandlers';
import { MonitoringService } from './monitoring';
import { IPC_CHANNELS } from '../shared/constants';
import { stopStaticServer } from './staticServer';
import { verifyAsarIntegrity } from './integrityCheck';
import { securityLog } from './securityLog';
import { offlineHeartbeatMonitor } from './offlineHeartbeat';
import { getAttestationData, getAttestationToken } from './buildAttestation';

// Lazy load collaboration manager to prevent ws import issues on some systems
let collaborationManager: typeof import('./collaborationManager').collaborationManager | null = null;
async function getCollaborationManager() {
  if (!collaborationManager) {
    try {
      const module = await import('./collaborationManager');
      collaborationManager = module.collaborationManager;
    } catch (err) {
      console.error('Failed to load collaboration manager:', err);
    }
  }
  return collaborationManager;
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Register custom protocol for serving local files (must be before app.ready)
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let mainWindow: BrowserWindow | null = null;
export let monitoringService: MonitoringService | null = null;

/**
 * Test whether the app has macOS Automation permission to query System Events.
 * Returns true if granted (or on non-macOS), false if explicitly denied.
 */
async function checkMacOSAutomationPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;
  return new Promise((resolve) => {
    try {
      // Must query a protected resource (e.g. frontmost process name) to actually
      // exercise the Automation permission. A simple `return "ok"` would succeed
      // even without permission because it doesn't access any guarded API.
      execSync(
        'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'',
        { timeout: 5000, encoding: 'utf-8' }
      );
      resolve(true);
    } catch (err: unknown) {
      const msg = String((err as Error).message || '');
      // macOS throws when Automation is denied
      if (
        msg.includes('Not authorized') ||
        msg.includes('1743') ||
        msg.includes('not allowed to send Apple events') ||
        msg.includes('errAEEventNotPermitted') ||
        msg.includes('not allowed assistive access')
      ) {
        resolve(false);
      } else {
        // Any other error (timeout, etc.) — allow through
        resolve(true);
      }
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      webviewTag: true,
    },
    show: false,
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../../../assets/win_icon.png')
      : path.join(__dirname, '../../../assets/mac_icon.png'),
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, renderer is placed as an extraResource at
    // Contents/Resources/renderer/ — use process.resourcesPath, NOT __dirname
    // (which points inside the asar archive and can't reach extraResources).
    mainWindow.loadFile(
      path.join(process.resourcesPath, 'renderer/index.html')
    );
  }

  offlineHeartbeatMonitor.attachWindow(mainWindow);
  offlineHeartbeatMonitor.start();

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    startNetworkPolling();
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    offlineHeartbeatMonitor.stop();
    mainWindow = null;
  });
}

// Register IPC handlers
registerFsHandlers(ipcMain, dialog);

// Register monitoring IPC handlers
ipcMain.on(IPC_CHANNELS.MONITORING_START, (_event, teamName: string, teamId: string) => {
  if (!mainWindow) return;
  if (!monitoringService) {
    monitoringService = new MonitoringService(mainWindow);
  }
  monitoringService.init(teamName, teamId);
});

ipcMain.on(IPC_CHANNELS.MONITORING_STOP, () => {
  monitoringService?.stopHeartbeat();
});

ipcMain.on('monitoring:setCurrentFile', (_event, filePath: string) => {
  monitoringService?.setCurrentFile(filePath);
});

ipcMain.on(IPC_CHANNELS.SECURITY_HEARTBEAT_PING, (_event, nonce: string) => {
  offlineHeartbeatMonitor.receivePing(nonce);
});

ipcMain.handle(IPC_CHANNELS.SECURITY_NONCE_REQUEST, async () => {
  return offlineHeartbeatMonitor.getNonce();
});

ipcMain.handle(IPC_CHANNELS.SECURITY_GET_LOG, async () => {
  return securityLog.getEntries();
});

ipcMain.handle(IPC_CHANNELS.SECURITY_GET_ATTESTATION, async () => {
  return getAttestationToken();
});

ipcMain.handle(IPC_CHANNELS.SECURITY_GET_ATTESTATION_DATA, async () => {
  return getAttestationData();
});

// Register collaboration IPC handlers
ipcMain.handle(IPC_CHANNELS.COLLAB_START_HOST, async (_event, userName: string, teamId?: string) => {
  const collab = await getCollaborationManager();
  if (!collab) throw new Error('Collaboration not available');
  if (mainWindow) {
    collab.setMainWindow(mainWindow);
  }
  return collab.startHost(userName, teamId);
});

ipcMain.handle(IPC_CHANNELS.COLLAB_JOIN_SESSION, async (_event, hostIp: string, userName: string, teamId?: string) => {
  const collab = await getCollaborationManager();
  if (!collab) throw new Error('Collaboration not available');
  if (mainWindow) {
    collab.setMainWindow(mainWindow);
  }
  return collab.joinAsClient(hostIp, userName, teamId);
});

ipcMain.handle(IPC_CHANNELS.COLLAB_STOP_SESSION, async () => {
  const collab = await getCollaborationManager();
  return collab?.stopSession();
});

ipcMain.handle(IPC_CHANNELS.COLLAB_GET_STATUS, async () => {
  const collab = await getCollaborationManager();
  return collab?.getStatus() ?? { isActive: false, mode: null, hostIp: null, port: 1234, connectedUsers: [] };
});

ipcMain.handle(IPC_CHANNELS.COLLAB_GET_LOCAL_IP, async () => {
  const collab = await getCollaborationManager();
  return collab?.getLocalIpAddress() ?? '127.0.0.1';
});

ipcMain.handle(IPC_CHANNELS.COLLAB_GET_NETWORK_INTERFACES, async () => {
  const collab = await getCollaborationManager();
  return collab?.getNetworkInterfaces() ?? [];
});

ipcMain.handle(IPC_CHANNELS.COLLAB_START_HOSTED_NETWORK, async (_event, ssid: string, password: string) => {
  const collab = await getCollaborationManager();
  if (!collab) return { success: false, error: 'Collaboration not available' };
  return collab.startHostedNetwork(ssid, password);
});

ipcMain.handle(IPC_CHANNELS.COLLAB_CHECK_LOCAL_NETWORK, async () => {
  const collab = await getCollaborationManager();
  if (!collab) return true;
  return collab.checkLocalNetworkAccess();
});

// App lifecycle
app.whenReady().then(async () => {
  securityLog.initialize();
  securityLog.append('APP_STARTED', {
    packaged: app.isPackaged,
    version: app.getVersion(),
  });

  if (!(await verifyAsarIntegrity(isDev))) {
    return;
  }

  getAttestationToken();

  if (!isDev) {
    app.on('web-contents-created', (_event, contents) => {
      contents.on('devtools-opened', () => {
        securityLog.append('DEVTOOLS_OPENED', {
          source: contents.getType(),
        });
        contents.closeDevTools();
      });
    });
  }

  // ── macOS: enforce Automation / System Events permission ─────────────────
  // The app uses osascript to detect active window (app-switching monitoring).
  // If the user denied it, block startup entirely. Loop with Retry so the user
  // can grant the permission in System Settings and continue without relaunching.
  if (process.platform === 'darwin' && !isDev) {
    let granted = await checkMacOSAutomationPermission();
    while (!granted) {
      const { response } = await dialog.showMessageBox({
        type: 'error',
        title: 'Permission Required',
        message: 'System Activity Monitoring Permission Required',
        detail:
          'Sonar Code Editor requires Automation access to monitor app switching during exams.\n\n' +
          'To grant permission:\n' +
          '  System Settings → Privacy & Security → Automation\n' +
          '  Enable "System Events" for Sonar Code Editor\n\n' +
          'After enabling the toggle, click Retry to continue.',
        buttons: ['Open System Settings', 'Retry', 'Quit'],
        defaultId: 0,
        cancelId: 2,
      });
      if (response === 2) {
        // Quit
        app.quit();
        return;
      }
      if (response === 0) {
        // Open System Settings and wait for user to come back
        await shell.openExternal(
          'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'
        );
      }
      // response === 1 (Retry) or fell through from Open Settings — re-check
      granted = await checkMacOSAutomationPermission();
    }
  }

  // Register protocol handler for serving local image files
  protocol.handle('local-file', (request) => {
    const parsedUrl = new URL(request.url);
    const filePath = parsedUrl.searchParams.get('path');
    if (!filePath) {
      return new Response('Missing path parameter', { status: 400 });
    }
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    if (!imageExts.includes(ext)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const buffer = fs.readFileSync(filePath);
      const mimeMap: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
        '.webp': 'image/webp', '.ico': 'image/x-icon',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return new Response(buffer, { headers: { 'Content-Type': mime } });
    } catch {
      return new Response('File not found', { status: 404 });
    }
  });

  // Set Content Security Policy (relaxed in dev for Vite HMR)
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: local-file: http://127.0.0.1:* ws://127.0.0.1:* ws://*:1234; img-src 'self' data: file: blob: local-file: http://127.0.0.1:*; connect-src 'self' https://*.appwrite.io wss://*.appwrite.io http://127.0.0.1:* ws://127.0.0.1:* ws://*:1234; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; frame-src http://127.0.0.1:*",
          ],
        },
      });
    });
  }

  // Set the dock icon for macOS during dev mode
  if (process.platform === 'darwin') {
    try {
      app.dock.setIcon(path.join(__dirname, '../../../assets/mac_icon.png'));
    } catch (e) {
      console.log('Could not set dock icon', e);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  monitoringService?.stopHeartbeat();
  offlineHeartbeatMonitor.stop();
  getCollaborationManager().then(collab => collab?.stopSession());
  stopStaticServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  securityLog.append('APP_QUIT', {
    packaged: app.isPackaged,
  });
  monitoringService?.stopHeartbeat();
  offlineHeartbeatMonitor.stop();
  getCollaborationManager().then(collab => collab?.stopSession());
});

// Network connectivity check — ping the actual Appwrite endpoint used by the app
let lastOnlineStatus: boolean | null = null;

async function checkConnectivity(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = net.request({
        method: 'HEAD',
        url: `${process.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1'}/health`
      });
      let resolved = false;

      request.on('response', () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
      });

      request.on('error', () => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });

      // Abandon request if it takes longer than 4 seconds
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          request.abort();
          resolve(false);
        }
      }, 4000);

      request.end();
    } catch {
      resolve(false);
    }
  });
}

function sendNetworkStatus(online: boolean): void {
  monitoringService?.setOnlineStatus(online);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('network:status', online);
  }
}

// Start polling only after the app is ready and window exists
let networkPollTimer: ReturnType<typeof setInterval> | null = null;

function startNetworkPolling(): void {
  if (networkPollTimer) return;

  // Send initial status immediately
  checkConnectivity().then((initialOnline) => {
    lastOnlineStatus = initialOnline;
    sendNetworkStatus(initialOnline);
  });

  // Poll every 2 seconds — always send so renderer stays in sync
  networkPollTimer = setInterval(async () => {
    const online = await checkConnectivity();
    lastOnlineStatus = online;
    sendNetworkStatus(online);
  }, 2000);
}

// Allow renderer to request current network status on demand
ipcMain.handle('network:getStatus', async () => {
  const online = await checkConnectivity();
  lastOnlineStatus = online;
  return online;
});

export { mainWindow };
