export const IPC_CHANNELS = {
  // File System
  FS_READ_DIR: 'fs:readDirectory',
  FS_READ_FILE: 'fs:readFile',
  FS_READ_FILE_BASE64: 'fs:readFileBase64',
  FS_WRITE_FILE: 'fs:writeFile',
  FS_CREATE_FILE: 'fs:createFile',
  FS_CREATE_FOLDER: 'fs:createFolder',
  FS_DELETE_ITEM: 'fs:deleteItem',
  FS_RENAME_ITEM: 'fs:renameItem',
  FS_SEARCH: 'fs:search',
  FS_OPEN_FOLDER_DIALOG: 'fs:openFolderDialog',
  FS_OPEN_FILE_DIALOG: 'fs:openFileDialog',
  // Monitoring
  MONITORING_START: 'monitoring:start',
  MONITORING_STOP: 'monitoring:stop',
  MONITORING_HEARTBEAT: 'monitoring:heartbeat',
  // Network
  NETWORK_STATUS: 'network:status',
  // Static Server
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_GET_URL: 'server:getUrl',
  // Dialog
  DIALOG_SHOW_ERROR: 'dialog:showError',
  DIALOG_SHOW_INFO: 'dialog:showInfo',
  // DevTools
  DEVTOOLS_OPEN: 'devtools:open',
  DEVTOOLS_CLOSE: 'devtools:close',
  DEVTOOLS_RESIZE: 'devtools:resize',
  // Active Window
  GET_ACTIVE_WINDOW: 'system:getActiveWindow',
  // System Permission
  SYSTEM_CHECK_PERMISSION: 'system:checkPermission',
  SYSTEM_OPEN_PREFS: 'system:openPrivacyPrefs',
  // Clipboard
  CLIPBOARD_READ_TEXT: 'clipboard:readText',
  // Collaboration (P2P)
  COLLAB_START_HOST: 'collaboration:startHost',
  COLLAB_JOIN_SESSION: 'collaboration:joinSession',
  COLLAB_STOP_SESSION: 'collaboration:stopSession',
  COLLAB_GET_STATUS: 'collaboration:getStatus',
  COLLAB_GET_LOCAL_IP: 'collaboration:getLocalIp',
  COLLAB_GET_NETWORK_INTERFACES: 'collaboration:getNetworkInterfaces',
  COLLAB_START_HOSTED_NETWORK: 'collaboration:startHostedNetwork',
  COLLAB_STATUS_CHANGE: 'collaboration:statusChange',
  COLLAB_CHECK_LOCAL_NETWORK: 'collaboration:checkLocalNetwork',
} as const;

export const APP_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 15000,
  DB_NAME: 'devwatch_db',
  COLLECTION_TEAMS: 'teams',
  COLLECTION_SESSIONS: 'sessions',
  COLLECTION_ACTIVITY_LOGS: 'activityLogs',
  COLLECTION_REPORTS: 'reports',
  COLLECTION_SETTINGS: 'settings',
} as const;
