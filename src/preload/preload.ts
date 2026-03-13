import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { ElectronAPI, CollaborationStatus } from '../shared/types';

const api: ElectronAPI = {
  fs: {
    readDirectory: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIR, path),
    readFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, path),
    readFileAsBase64: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE_BASE64, path),
    writeFile: (path, content) => ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, path, content),
    createFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_FILE, path),
    createFolder: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_FOLDER, path),
    deleteItem: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_ITEM, path),
    renameItem: (oldPath, newPath) => ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME_ITEM, oldPath, newPath),
    search: (dirPath, query) => ipcRenderer.invoke(IPC_CHANNELS.FS_SEARCH, dirPath, query),
    openFolderDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FS_OPEN_FOLDER_DIALOG),
    openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FS_OPEN_FILE_DIALOG),
  },
  server: {
    start: (rootDir: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVER_START, rootDir),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.SERVER_STOP),
    getUrl: () => ipcRenderer.invoke(IPC_CHANNELS.SERVER_GET_URL),
  },
  monitoring: {
    start: (teamName, teamId) => ipcRenderer.send(IPC_CHANNELS.MONITORING_START, teamName, teamId),
    stop: () => ipcRenderer.send(IPC_CHANNELS.MONITORING_STOP),
    setCurrentFile: (filePath) => ipcRenderer.send('monitoring:setCurrentFile', filePath),
  },
  network: {
    onStatusChange: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, status: boolean) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.NETWORK_STATUS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.NETWORK_STATUS, handler);
    },
    getStatus: () => ipcRenderer.invoke('network:getStatus'),
  },
  dialog: {
    showError: (message) => ipcRenderer.send(IPC_CHANNELS.DIALOG_SHOW_ERROR, message),
    showInfo: (message) => ipcRenderer.send(IPC_CHANNELS.DIALOG_SHOW_INFO, message),
  },
  devtools: {
    open: (previewContentsId) =>
      ipcRenderer.invoke(IPC_CHANNELS.DEVTOOLS_OPEN, previewContentsId),
    close: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DEVTOOLS_CLOSE),
    resize: (bounds) =>
      ipcRenderer.invoke(IPC_CHANNELS.DEVTOOLS_RESIZE, bounds),
  },
  system: {
    getActiveWindow: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_WINDOW),
    checkPermission: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CHECK_PERMISSION),
    openPrivacyPrefs: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_PREFS),
  },
  clipboard: {
    readText: () => ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_READ_TEXT),
  },
  collaboration: {
    startHost: (userName: string, teamId?: string) => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_START_HOST, userName, teamId),
    joinSession: (hostIp: string, userName: string, teamId?: string) => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_JOIN_SESSION, hostIp, userName, teamId),
    stopSession: () => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_STOP_SESSION),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_GET_STATUS),
    getLocalIp: () => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_GET_LOCAL_IP),
    getNetworkInterfaces: () => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_GET_NETWORK_INTERFACES),
    startHostedNetwork: (ssid: string, password: string) => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_START_HOSTED_NETWORK, ssid, password),
    checkLocalNetwork: () => ipcRenderer.invoke(IPC_CHANNELS.COLLAB_CHECK_LOCAL_NETWORK) as Promise<boolean>,
    onStatusChange: (callback: (status: CollaborationStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: CollaborationStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.COLLAB_STATUS_CHANGE, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.COLLAB_STATUS_CHANGE, handler);
    },
  },
  security: {
    sendHeartbeat: (nonce: string) => ipcRenderer.send(IPC_CHANNELS.SECURITY_HEARTBEAT_PING, nonce),
    requestNonce: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_NONCE_REQUEST),
    getSecurityLog: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_LOG),
    getAttestationToken: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_ATTESTATION),
    getAttestationData: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY_GET_ATTESTATION_DATA),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

// Expose heartbeat listener
contextBridge.exposeInMainWorld('electronEvents', {
  onHeartbeat: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('monitoring:heartbeat', (_event, payload) => callback(payload));
  },
  onFlushQueue: (callback: (queue: unknown[]) => void) => {
    ipcRenderer.on('monitoring:flushQueue', (_event, queue) => callback(queue));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
