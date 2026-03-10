export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  extension?: string;
}

export interface Team {
  $id?: string;
  teamName: string;
  password?: string;
  role: 'team' | 'admin';
  studentIds?: string[];
  createdAt?: string;
}

export interface Session {
  $id?: string;
  teamId: string;
  teamName: string;
  status: 'online' | 'offline';
  lastSeen: string;
  ipAddress?: string;
}

export interface ActivityLog {
  $id?: string;
  teamId: string;
  teamName: string;
  currentWindow: string;
  currentFile: string;
  status: 'online' | 'offline';
  timestamp: string;
  event?: 'went_online' | 'went_offline' | 'heartbeat' | 'offline_sync';
  appName?: string;
  windowTitle?: string;
}

/** Accumulated sync data stored as JSON in ActivityLog.windowTitle */
export interface ActivitySyncData {
  sessionStart: string;
  heartbeatCount: number;
  apps: Record<string, number>;       // appName → total seconds
  files: string[];                     // unique files worked on
  windows: string[];                   // unique windows seen
  statusChanges: number;               // number of online↔offline transitions
  totalOnlineSec: number;
  totalOfflineSec: number;
  lastStatus: 'online' | 'offline';
  lastStatusAt: string;
  offlinePeriods: Array<{ from: string; to: string; duration: number }>;
  activityEvents?: Array<{ type: string; timestamp: string; details?: string }>;
}

export interface StatusEntry {
  status: 'online' | 'offline';
  from: string;
  to: string;
  duration: number;
}

export interface AppUsageEntry {
  appName: string;
  windowTitle: string;
  firstSeen: string;
  lastSeen: string;
  totalTime: number;
}

export interface Report {
  $id?: string;
  teamId: string;
  teamName: string;
  sessionStart: string;
  sessionEnd: string;
  generatedAt: string;
  reportData: string;
}

export interface ReportData {
  team: Team;
  sessionStart: string;
  sessionEnd: string;
  statusTimeline: StatusEntry[];
  appUsage: AppUsageEntry[];
  summary: {
    totalDuration: number;
    totalOnlineTime: number;
    totalOfflineTime: number;
    disconnections: number;
    longestOnlineStretch: number;
    percentOnline: number;
    percentInIDE: number;
    appSwitches: number;
  };
}

export interface HeartbeatPayload {
  teamName: string;
  teamId: string;
  currentWindow: string;
  currentFile: string;
  status: 'online' | 'offline';
  timestamp: string;
  appName?: string;
  activityEvents?: Array<{ type: string; timestamp: string; details?: string }>;
}

export interface SearchResult {
  path: string;
  name: string;
  line: number;
  text: string;
}

export interface ElectronAPI {
  fs: {
    readDirectory: (path: string) => Promise<FileNode[]>;
    readFile: (path: string) => Promise<string>;
    readFileAsBase64: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    createFile: (path: string) => Promise<void>;
    createFolder: (path: string) => Promise<void>;
    deleteItem: (path: string) => Promise<void>;
    renameItem: (oldPath: string, newPath: string) => Promise<void>;
    search: (dirPath: string, query: string) => Promise<SearchResult[]>;
    openFolderDialog: () => Promise<{ path: string; isDirectory: boolean } | null>;
    openFileDialog: () => Promise<{ path: string; isDirectory: boolean; parentPath: string; name: string } | null>;
  };
  server: {
    start: (rootDir: string) => Promise<number>;
    stop: () => Promise<void>;
    getUrl: () => Promise<string | null>;
  };
  monitoring: {
    start: (teamName: string, teamId: string) => void;
    stop: () => void;
    setCurrentFile: (filePath: string) => void;
  };
  network: {
    onStatusChange: (callback: (status: boolean) => void) => () => void;
    getStatus: () => Promise<boolean>;
  };
  dialog: {
    showError: (message: string) => void;
    showInfo: (message: string) => void;
  };
  devtools: {
    open: (previewContentsId: number) => Promise<void>;
    close: () => Promise<void>;
    resize: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
  };
  system: {
    getActiveWindow: () => Promise<string | null>;
    checkPermission: () => Promise<boolean>;
    openPrivacyPrefs: () => Promise<void>;
  };
  clipboard: {
    readText: () => Promise<string>;
  };
  collaboration: {
    startHost: (userName: string, teamId?: string) => Promise<CollaborationStatus>;
    joinSession: (hostIp: string, userName: string, teamId?: string) => Promise<CollaborationStatus>;
    stopSession: () => Promise<void>;
    getStatus: () => Promise<CollaborationStatus>;
    getLocalIp: () => Promise<string>;
    getNetworkInterfaces: () => Promise<{ name: string; ip: string }[]>;
    startHostedNetwork: (ssid: string, password: string) => Promise<{ success: boolean; error?: string }>;
    checkLocalNetwork: () => Promise<boolean>;
    onStatusChange: (callback: (status: CollaborationStatus) => void) => () => void;
  };
}

// Collaboration Types
export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
}

export interface CollaborationStatus {
  isActive: boolean;
  mode: 'host' | 'client' | null;
  hostIp: string | null;
  port: number;
  connectedUsers: CollaborationUser[];
  networkName?: string;
}

// ---- Admin-controlled Editor Feature Toggles ----
export interface EditorFeatureToggles {
  intellisenseSuggest: boolean;
  snippetSuggestions: boolean;
  parameterHints: boolean;
  hover: boolean;
  goToDefinition: boolean;
  goToDeclaration: boolean;
  goToImplementation: boolean;
  findReferences: boolean;
  renameSymbol: boolean;
  codeActionsQuickFixes: boolean;
  formatDocument: boolean;
  formatSelection: boolean;
  autoClosingBrackets: boolean;
  autoClosingQuotes: boolean;
  autoClosingComments: boolean;
  autoClosingDelete: boolean;
  autoClosingOvertype: boolean;
  autoSurround: boolean;
  htmlTagAutoSuggest: boolean;
  closingTagAutoComplete: boolean;
  codeLens: boolean;
  inlineHints: boolean;
  inlayHints: boolean;
  lightbulbActions: boolean;
  peekDefinition: boolean;
  peekReferences: boolean;
  markersDiagnostics: boolean;
  errorSquiggles: boolean;
  warningSquiggles: boolean;
  codeCompletionTriggerCharacters: boolean;
  linkedEditing: boolean;
}

export const DEFAULT_FEATURE_TOGGLES: EditorFeatureToggles = {
  intellisenseSuggest: false,
  snippetSuggestions: false,
  parameterHints: false,
  hover: false,
  goToDefinition: false,
  goToDeclaration: false,
  goToImplementation: false,
  findReferences: false,
  renameSymbol: false,
  codeActionsQuickFixes: false,
  formatDocument: false,
  formatSelection: false,
  autoClosingBrackets: false,
  autoClosingQuotes: false,
  autoClosingComments: false,
  autoClosingDelete: false,
  autoClosingOvertype: false,
  autoSurround: false,
  htmlTagAutoSuggest: false,
  closingTagAutoComplete: false,
  codeLens: false,
  inlineHints: false,
  inlayHints: false,
  lightbulbActions: false,
  peekDefinition: false,
  peekReferences: false,
  markersDiagnostics: false,
  errorSquiggles: false,
  warningSquiggles: false,
  codeCompletionTriggerCharacters: false,
  linkedEditing: false,
};
