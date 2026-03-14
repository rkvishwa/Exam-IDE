import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type { editor } from "monaco-editor";
import { CollaborationStatus, CollaborationUser } from "../../shared/types";
import { useAuth } from "./AuthContext";

// Shared file metadata
export interface SharedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  type?: "file" | "image";
}

/**
 * Collapse repeated slashes and strip trailing slash for stable comparison.
 */
function normalizePath(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
}

/**
 * Convert an absolute path to a relative path against a workspace root.
 * Handles Windows/Mac path separator differences and case-insensitive
 * drive letters for cross-platform collaboration sync.
 */
function toRelativePath(fullPath: string, wsRoot: string): string {
  const normFull = normalizePath(fullPath);
  const normRoot = normalizePath(wsRoot);

  if (normFull.toLowerCase().startsWith(normRoot.toLowerCase())) {
    let rel = normFull.slice(normRoot.length);
    if (rel.startsWith("/")) rel = rel.slice(1);
    return rel;
  }

  const fullSegs = normFull.split("/");
  const rootSegs = normRoot.split("/");
  let matchCount = 0;
  for (
    let i = rootSegs.length - 1, j = fullSegs.length - 1;
    i >= 0 && j >= 0;
    i--, j--
  ) {
    if (rootSegs[i].toLowerCase() !== fullSegs[j].toLowerCase()) break;
    matchCount++;
  }
  if (matchCount > 0 && matchCount === rootSegs.length) {
    const rel = fullSegs.slice(fullSegs.length - matchCount + rootSegs.length);
    if (rel.length > 0) return rel.join("/");
  }

  return normFull;
}

// Workspace sync metadata
export interface WorkspaceFile {
  relativePath: string;
  content: string;
  isDirectory: boolean;
}

export interface WorkspaceMetadata {
  folderName: string;
  hostPath: string;
  files: WorkspaceFile[];
}

export interface FileOperation {
  type: "create-file" | "create-folder" | "delete" | "rename";
  relativePath: string;
  newRelativePath?: string;
  content?: string;
  isDirectory?: boolean;
  timestamp: number;
  clientId: number;
}

interface CollaborationContextValue {
  isActive: boolean;
  status: CollaborationStatus | null;
  connectedUsers: CollaborationUser[];
  userName: string;
  setUserName: (name: string) => void;
  startHost: (overrideName?: string) => Promise<void>;
  joinSession: (hostIp: string, overrideName?: string) => Promise<void>;
  stopSession: () => Promise<void>;
  onBeforeSessionStop: (callback: () => void) => () => void;
  bindEditor: (
    monacoEditor: editor.IStandaloneCodeEditor,
    filePath: string,
    workspaceRoot?: string,
  ) => void;
  unbindEditor: (filePath?: string) => void;
  getCurrentEditorContent: () => string | null;
  getFileContent: (filePath: string, workspaceRoot?: string) => string | null;
  setFileContent: (filePath: string, content: string, workspaceRoot?: string) => void;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  // Shared file methods
  shareFile: (file: SharedFile) => void;
  getSharedFiles: () => SharedFile[];
  setActiveSharedFile: (path: string) => void;
  activeSharedFile: string | null;
  onSharedFilesChange: (callback: (files: SharedFile[]) => void) => () => void;
  onActiveFileChange: (callback: (path: string | null) => void) => () => void;
  // Workspace sharing
  sharedWorkspace: string | null;
  setSharedWorkspace: (path: string) => void;
  onWorkspaceChange: (callback: (path: string | null) => void) => () => void;
  // Workspace sync (with files)
  shareWorkspaceWithFiles: (path: string, files: WorkspaceFile[]) => void;
  workspaceMetadata: WorkspaceMetadata | null;
  onWorkspaceMetadataChange: (
    callback: (metadata: WorkspaceMetadata | null) => void,
  ) => () => void;
  // File operation sync
  broadcastFileOp: (op: Omit<FileOperation, "timestamp" | "clientId">) => void;
  onFileOperation: (callback: (op: FileOperation) => void) => () => void;
  onRemoteContentChange: (callback: (filePath: string) => void) => () => void;
  connectionError: string | null;
  clearConnectionError: () => void;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(
  null,
);

// Generate a random color for the user
function generateUserColor(): string {
  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

interface CollaborationProviderProps {
  children: React.ReactNode;
}

export function CollaborationProvider({
  children,
}: CollaborationProviderProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("collaborationUserName") || "";
  });
  const [activeSharedFile, setActiveSharedFileState] = useState<string | null>(
    null,
  );
  const [sharedWorkspace, setSharedWorkspaceState] = useState<string | null>(
    null,
  );
  const [workspaceMetadata, setWorkspaceMetadataState] =
    useState<WorkspaceMetadata | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs to store Yjs instances (persist across renders)
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const currentFileRef = useRef<string | null>(null);
  const currentEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const settingsListenersRef = useRef<{ storage: ((e: StorageEvent) => void) | null; custom: (() => void) | null }>({ storage: null, custom: null });
  const userColorRef = useRef<string>(generateUserColor());

  // Safe destroy helper — y-monaco's MonacoBinding.destroy() is not idempotent.
  // It also registers an internal monacoModel.onWillDispose callback that can
  // call destroy() before our code does, leading to a double-destroy where
  // doc.off('beforeAllTransactions', …) fails because the observer was already
  // removed.  Wrapping every destroy() call prevents the console error.
  const safeDestroyBinding = useCallback(() => {
    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
      } catch {
        // binding was already destroyed (e.g. by onWillDispose)
      }
      bindingRef.current = null;
    }
  }, []);

  // Shared file callbacks
  const sharedFilesCallbacksRef = useRef<Set<(files: SharedFile[]) => void>>(
    new Set(),
  );
  const activeFileCallbacksRef = useRef<Set<(path: string | null) => void>>(
    new Set(),
  );
  const workspaceCallbacksRef = useRef<Set<(path: string | null) => void>>(
    new Set(),
  );
  const workspaceMetadataCallbacksRef = useRef<
    Set<(metadata: WorkspaceMetadata | null) => void>
  >(new Set());
  const fileOpCallbacksRef = useRef<Set<(op: FileOperation) => void>>(
    new Set(),
  );
  const remoteContentCallbacksRef = useRef<Set<(filePath: string) => void>>(
    new Set(),
  );
  const beforeStopCallbacksRef = useRef<Set<() => void>>(new Set());

  // Save username to localStorage when it changes
  useEffect(() => {
    if (userName) {
      localStorage.setItem("collaborationUserName", userName);
    }
  }, [userName]);

  // Subscribe to status changes from main process
  // Note: connectedUsers is now tracked via Yjs awareness, not from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.collaboration.onStatusChange(
      (newStatus) => {
        setStatus(newStatus);
        // Don't update connectedUsers from main process - it's handled via Yjs awareness
      },
    );

    // Get initial status
    window.electronAPI.collaboration.getStatus().then((initialStatus) => {
      setStatus(initialStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    // Clean up refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Clean up Monaco binding
    safeDestroyBinding();

    // Clean up WebSocket provider
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    // Clean up Y.Doc
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    // Clean up injected cursor styles
    const styleEl = document.getElementById("yjs-cursor-styles");
    if (styleEl) {
      styleEl.remove();
    }

    // Clean up settings listeners
    if (settingsListenersRef.current.storage) {
      window.removeEventListener("storage", settingsListenersRef.current.storage);
    }
    if (settingsListenersRef.current.custom) {
      window.removeEventListener("collab-settings-changed", settingsListenersRef.current.custom);
    }
    settingsListenersRef.current = { storage: null, custom: null };

    currentFileRef.current = null;
    currentEditorRef.current = null;
  }, []);

  const initializeYjs = useCallback(
    (hostIp: string, port: number, isHost = false) => {
      // Clean up any existing instances
      cleanup();

      // Create new Yjs document
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Connect to WebSocket server
      const wsUrl = `ws://${hostIp}:${port}`;
      console.log("Connecting to WebSocket server:", wsUrl);

      const teamId = user?.$id || 'default';
      const roomName = `monaco-collab-${teamId}`;
      console.log(`Using collaboration room: ${roomName}`);
      const provider = new WebsocketProvider(wsUrl, roomName, ydoc, {
        connect: true,
      });
      providerRef.current = provider;

      // Detect team-mismatch rejection from host
      provider.on('connection-close', (event: CloseEvent | null) => {
        if (event && event.code === 1008 && event.reason === 'Team mismatch') {
          console.error('Connection rejected: different team');
          provider.disconnect();
          cleanup();
          setStatus(null);
          setConnectedUsers([]);
          setConnectionError('Connection rejected: you are not on the same team as the host.');
        }
      });

      // Set user awareness information
      provider.awareness.setLocalStateField("user", {
        name: userName,
        color: userColorRef.current,
      });

      // Initialize shared files map and observe changes
      const sharedFilesMap = ydoc.getMap<SharedFile>("sharedFiles");
      const activeFileText = ydoc.getText("activeFile");
      const workspaceText = ydoc.getText("sharedWorkspace");
      const workspaceMetadataMap =
        ydoc.getMap<WorkspaceMetadata>("workspaceMetadata");

      // Observe workspace metadata changes (for file sync)
      workspaceMetadataMap.observe(() => {
        const metadata = workspaceMetadataMap.get("current") || null;
        console.log("Workspace metadata updated:", metadata?.folderName);
        setWorkspaceMetadataState(metadata);
        workspaceMetadataCallbacksRef.current.forEach((cb) => cb(metadata));
      });

      // File operation sync via Y.Array
      const fileOpsArray = ydoc.getArray<FileOperation>("fileOps");
      // The host connects to its own relay server. Because no other peer is
      // present at that point, its initial sync-step-1 message is lost and
      // nobody ever responds with sync-step-2. The y-websocket provider
      // therefore never emits the "sync" event for the host, which means
      // fileOpsSynced would stay false forever — silently dropping every
      // incoming file operation from clients.
      // Fix: for the host we set fileOpsSynced = true immediately because
      // the host's Y.Doc is authoritative (there is no history to replay).
      let fileOpsSynced = isHost;

      fileOpsArray.observe((event) => {
        if (!fileOpsSynced) return;
        event.changes.delta.forEach((delta: any) => {
          if (delta.insert) {
            (delta.insert as FileOperation[]).forEach((op) => {
              if (op.clientId === provider.awareness.clientID) return;
              console.log("Received file operation:", op.type, op.relativePath);
              fileOpCallbacksRef.current.forEach((cb) => cb(op));
            });
          }
        });
      });

      // Observe all Y.Text changes to broadcast remote edits directly
      ydoc.on("update", (update, origin) => {
        // Only broadcast if the update came from a remote connection (not local)
        // and if it's the websocket provider that triggered it.
        // Actually, Yjs doesn't give us the type mapping directly in the update event.
        // A better approach is to observe the entire Yjs document for sub-type changes,
        // or just let Yjs handle the text observation.
      });

      ydoc.on("subdocs", () => { }); // Just a placeholder, we'll use a better approach below.

      // We'll track which Y.Text instances we have already observed to avoid duplicates
      const observedTexts = new Set<string>();

      // Whenever a new top-level type is discovered (which corresponds to a file),
      // we attach an observer to it.
      ydoc.on("afterTransaction", (tr) => {
        if (tr.local) return; // Only notify for remote changes

        tr.changed.forEach((changedType, key) => {
          if (changedType instanceof Y.Text && key) {
            // A remote edit happened on this Y.Text!
            // The docName (key) is the path (with slashes replaced and converted to _ usually, 
            // but we need the actual file path. Wait, earlier we used: 
            // relativePath.replace(/[^a-zA-Z0-9]/g, "_")
            // This means we can't easily reverse the key back to the file path.
            // Oh, wait, we can just let IDE.tsx check using the getFileContent with the active file.
            // Let's just trigger a generic remote content change event because we know *some* file changed remotely!

            // To be precise, let's reverse the key logic or just send the docName.
            // For now, let's just trigger all callbacks with the docName and let consumers figure it out.
            // Actually, we can just say "a remote edit happened".
            remoteContentCallbacksRef.current.forEach((cb) => cb(key?.toString() || ""));
          }
        });
      });

      // Observe workspace changes
      workspaceText.observe(() => {
        const path = workspaceText.toString() || null;
        console.log("Shared workspace updated:", path);
        setSharedWorkspaceState(path);
        workspaceCallbacksRef.current.forEach((cb) => cb(path));
      });

      // Observe shared files changes
      sharedFilesMap.observe(() => {
        const files = Array.from(sharedFilesMap.values());
        console.log(
          "Shared files updated:",
          files.map((f) => f.name).join(", "),
        );
        sharedFilesCallbacksRef.current.forEach((cb) => cb(files));
      });

      // Observe active file changes
      activeFileText.observe(() => {
        const path = activeFileText.toString() || null;
        console.log("Active shared file:", path);
        setActiveSharedFileState(path);
        activeFileCallbacksRef.current.forEach((cb) => cb(path));
      });

      // Track last injected CSS to avoid unnecessary DOM mutations that can
      // interfere with focus on Windows Electron during collaboration.
      let lastInjectedCSS = "";

      // Helper to update user list from awareness states
      const updateUserList = () => {
        const states = Array.from(provider.awareness.getStates().entries());
        const users: CollaborationUser[] = states
          .filter(([, state]) => state.user)
          .map(([clientId, state]) => ({
            id: String(clientId),
            name: state.user.name,
            color: state.user.color,
          }));
        // Only update state if the user list actually changed to avoid
        // unnecessary re-renders (awareness fires every ~2 s even when
        // the list is unchanged, which would cascade re-renders into the
        // file tree and steal focus from inline-create inputs).
        setConnectedUsers((prev) => {
          if (
            prev.length === users.length &&
            prev.every(
              (u, i) =>
                u.id === users[i].id &&
                u.name === users[i].name &&
                u.color === users[i].color,
            )
          ) {
            return prev;
          }
          return users;
        });

        // Inject CSS for remote cursor colors and labels
        injectCursorStyles(states);
      };

      // Inject dynamic CSS for cursor colors and user name labels
      const injectCursorStyles = (
        states: [number, { user?: { name: string; color: string } }][],
      ) => {
        const styleId = "yjs-cursor-styles";
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }

        const showUsernames = localStorage.getItem("ide-collab-usernames") !== "false";
        const opacityPct = Number(localStorage.getItem("ide-collab-username-opacity") ?? 80);
        const opacity = opacityPct / 100;

        const localClientId = provider.awareness.clientID;
        const css = states
          .filter(
            ([clientId, state]) => state.user && clientId !== localClientId,
          )
          .map(([clientId, state]) => {
            const { name, color } = state.user!;
            return `
              .yRemoteSelection-${clientId} {
                background-color: ${color}33 !important;
              }
              .yRemoteSelectionHead-${clientId} {
                border-color: ${color} !important;
                border-left-width: 2px;
                border-left-style: solid;
              }
              .yRemoteSelectionHead-${clientId}::after {
                content: '${showUsernames ? name.replace(/'/g, "\\'") : " "}';
                position: absolute;
                top: -18px;
                left: -2px;
                background-color: ${color};
                color: white;
                font-size: 11px;
                font-weight: 500;
                padding: ${showUsernames ? "1px 6px" : "0"};
                border-radius: 3px 3px 3px 0;
                white-space: nowrap;
                pointer-events: none;
                z-index: 1000;
                opacity: ${showUsernames ? opacity : 0};
              }
            `;
          })
          .join("\n");

        // Skip DOM mutation if CSS hasn't changed — avoids unnecessary
        // style recalc that can interfere with focus on Windows Electron.
        if (css !== lastInjectedCSS) {
          styleEl.textContent = css;
          lastInjectedCSS = css;
        }
      };

      // Re-inject cursor styles when collaboration settings change
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "ide-collab-usernames" || e.key === "ide-collab-username-opacity") {
          updateUserList();
        }
      };
      const handleCollabSettingsChanged = () => {
        updateUserList();
      };
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("collab-settings-changed", handleCollabSettingsChanged);
      settingsListenersRef.current = { storage: handleStorageChange, custom: handleCollabSettingsChanged };

      // Listen for awareness changes (user list updates)
      provider.awareness.on("change", updateUserList);

      // Update user list immediately with local user
      updateUserList();

      // Also refresh user list periodically to catch any missed updates
      const refreshInterval = setInterval(() => {
        if (provider.wsconnected) {
          updateUserList();
        }
      }, 2000);
      refreshIntervalRef.current = refreshInterval;

      // Connection status logging
      provider.on("status", (event: { status: string }) => {
        console.log("WebSocket status:", event.status);
        // Re-update user list on connection changes
        if (event.status === "connected") {
          updateUserList();
        }
      });

      provider.on("sync", (isSynced: boolean) => {
        console.log("Yjs sync status:", isSynced);
        if (isSynced) {
          fileOpsSynced = true;
          updateUserList();
          // Notify about existing shared files after sync
          const files = Array.from(sharedFilesMap.values());
          if (files.length > 0) {
            console.log(
              "Synced shared files:",
              files.map((f) => f.name).join(", "),
            );
            sharedFilesCallbacksRef.current.forEach((cb) => cb(files));
          }
          // Notify about active file
          const activePath = activeFileText.toString() || null;
          if (activePath) {
            setActiveSharedFileState(activePath);
            activeFileCallbacksRef.current.forEach((cb) => cb(activePath));
          }
          // Notify about shared workspace
          const workspacePath = workspaceText.toString() || null;
          if (workspacePath) {
            setSharedWorkspaceState(workspacePath);
            workspaceCallbacksRef.current.forEach((cb) => cb(workspacePath));
          }
          // Notify about workspace metadata (for file sync)
          const metadata = workspaceMetadataMap.get("current") || null;
          if (metadata) {
            console.log(
              "Synced workspace metadata:",
              metadata.folderName,
              `(${metadata.files.length} files)`,
            );
            setWorkspaceMetadataState(metadata);
            workspaceMetadataCallbacksRef.current.forEach((cb) => cb(metadata));
          }
        }
      });

      return { ydoc, provider };
    },
    [cleanup, userName, user?.$id],
  );

  const startHost = useCallback(async (overrideName?: string) => {
    const nameToUse = overrideName || userName;
    if (!nameToUse.trim()) {
      throw new Error("Please enter your name");
    }

    try {
      const newStatus =
        await window.electronAPI.collaboration.startHost(nameToUse, user?.$id);

      if (newStatus.hostIp) {
        // Host connects to localhost since the server is on their own machine
        // Using 127.0.0.1 ensures reliable local connection
        initializeYjs("127.0.0.1", newStatus.port, true);
      }

      setStatus(newStatus);
    } catch (error) {
      console.error("Failed to start host:", error);
      throw error;
    }
  }, [initializeYjs, userName, user?.$id]);

  const joinSession = useCallback(
    async (hostIp: string, overrideName?: string) => {
      const nameToUse = overrideName || userName;
      if (!nameToUse.trim()) {
        throw new Error("Please enter your name");
      }
      if (!hostIp.trim()) {
        throw new Error("Please enter the host IP address");
      }

      try {
        const newStatus = await window.electronAPI.collaboration.joinSession(
          hostIp,
          nameToUse,
          user?.$id
        );

        // Initialize Yjs connection to remote host
        initializeYjs(hostIp, newStatus.port);

        setStatus(newStatus);
      } catch (error) {
        console.error("Failed to join session:", error);
        throw error;
      }
    },
    [initializeYjs, userName, user?.$id],
  );

  const onBeforeSessionStop = useCallback((callback: () => void) => {
    beforeStopCallbacksRef.current.add(callback);
    return () => {
      beforeStopCallbacksRef.current.delete(callback);
    };
  }, []);

  const stopSession = useCallback(async () => {
    try {
      beforeStopCallbacksRef.current.forEach((cb) => cb());
      cleanup();
      await window.electronAPI.collaboration.stopSession();
      setStatus(null);
      setConnectedUsers([]);
    } catch (error) {
      console.error("Failed to stop session:", error);
      throw error;
    }
  }, [cleanup]);

  const bindEditor = useCallback(
    (
      monacoEditor: editor.IStandaloneCodeEditor,
      filePath: string,
      workspaceRoot?: string,
    ) => {
      if (!ydocRef.current || !providerRef.current) {
        console.warn("Cannot bind editor: Collaboration not active");
        return;
      }

      // Check if we're already bound to this file
      if (currentFileRef.current === filePath && bindingRef.current) {
        return;
      }

      // Clean up existing binding if switching files
      safeDestroyBinding();

      // Calculate relative path from workspace root for consistent docName across machines
      let relativePath = filePath;
      if (workspaceRoot) {
        relativePath = toRelativePath(filePath, workspaceRoot);
      }

      // Create a sanitized document name from the relative path
      // This ensures each file has its own Y.Text type and syncs across machines
      const docName = relativePath.replace(/[^a-zA-Z0-9]/g, "_");
      console.log(`Collaboration docName: ${docName} (from ${relativePath})`);

      // Get or create the Y.Text type for this file
      const ytext = ydocRef.current.getText(docName);
      const awareness = providerRef.current.awareness;
      const doc = ydocRef.current;

      // Get the Monaco model
      const model = monacoEditor.getModel();
      if (!model) {
        console.warn("Cannot bind editor: No model");
        return;
      }

      const currentYTextContent = ytext.toString();
      const currentModelContent = model.getValue();

      // Handle content synchronization:
      // - If Y.Text has content (from another user), SET the model to match it
      // - If Y.Text is empty but model has content (we're first), initialize Y.Text
      // - If both are empty, nothing to do
      if (
        currentYTextContent.length > 0 &&
        currentYTextContent !== currentModelContent
      ) {
        // Y.Text already has content from collaboration - sync model TO ytext
        // This must happen BEFORE creating binding to avoid conflicts
        console.log(
          `Syncing model to collaborative content for: ${docName} (${currentYTextContent.length} chars)`,
        );
        model.setValue(currentYTextContent);
      } else if (
        currentYTextContent.length === 0 &&
        currentModelContent.length > 0
      ) {
        // We're first to open this file - share our content
        console.log(
          `Initializing collaborative document from local file: ${docName}`,
        );
        ytext.insert(0, currentModelContent);
      }

      // ─── Create the MonacoBinding WITHOUT awareness ───────────────
      // y-monaco has two bugs with cursor awareness:
      //   1. onDidChangeCursorSelection handlers are never disposed in
      //      destroy(), so they accumulate across rebinds and send stale
      //      cursor positions.
      //   2. _beforeTransaction (which saves cursor before remote edits)
      //      is guarded by the same mutex as the model-change handler,
      //      so it gets skipped during local typing — when a concurrent
      //      remote edit arrives the local cursor isn't saved/restored
      //      properly.
      // We pass awareness=null so y-monaco doesn't register its broken
      // cursor handlers, then set up our own properly-managed versions.
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([monacoEditor]),
        null, // Don't let y-monaco manage cursor awareness
      );

      // ─── Our own cursor awareness management ─────────────────────
      // These are properly disposed when destroy() is called.

      // 1. Send local cursor position to awareness whenever it changes.
      //    Also broadcast once immediately so peers see this machine's cursor
      //    right after bind — without this initial publish, remote machines
      //    only see the cursor after the user physically moves it.
      const publishCursor = () => {
        if (monacoEditor.getModel() !== model) return;
        const sel = monacoEditor.getSelection();
        if (sel === null) return;

        let anchor = model.getOffsetAt(sel.getStartPosition());
        let head = model.getOffsetAt(sel.getEndPosition());
        if (sel.getDirection() === 1 /* RTL */) {
          const tmp = anchor;
          anchor = head;
          head = tmp;
        }

        awareness.setLocalStateField("selection", {
          anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
          head: Y.createRelativePositionFromTypeIndex(ytext, head),
        });
      };

      const cursorDisposer = monacoEditor.onDidChangeCursorSelection(publishCursor);

      // Broadcast current cursor position immediately so peers can see it
      // without waiting for the first cursor-move event after this bind.
      publishCursor();


      // 2. Render remote cursor decorations when awareness changes
      let decorationIds: string[] = [];
      let isRerendering = false;

      const rerenderDecorations = () => {
        if (monacoEditor.getModel() !== model) return;
        const newDecorations: any[] = [];

        awareness.getStates().forEach((state: any, clientID: number) => {
          if (
            clientID !== doc.clientID &&
            state.selection != null &&
            state.selection.anchor != null &&
            state.selection.head != null
          ) {
            const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
              state.selection.anchor,
              doc,
            );
            const headAbs = Y.createAbsolutePositionFromRelativePosition(
              state.selection.head,
              doc,
            );
            if (
              anchorAbs !== null &&
              headAbs !== null &&
              anchorAbs.type === ytext &&
              headAbs.type === ytext
            ) {
              let start, end, afterContentClassName: string | null, beforeContentClassName: string | null;
              if (anchorAbs.index < headAbs.index) {
                start = model.getPositionAt(anchorAbs.index);
                end = model.getPositionAt(headAbs.index);
                afterContentClassName =
                  "yRemoteSelectionHead yRemoteSelectionHead-" + clientID;
                beforeContentClassName = null;
              } else {
                start = model.getPositionAt(headAbs.index);
                end = model.getPositionAt(anchorAbs.index);
                afterContentClassName = null;
                beforeContentClassName =
                  "yRemoteSelectionHead yRemoteSelectionHead-" + clientID;
              }
              newDecorations.push({
                range: {
                  startLineNumber: start.lineNumber,
                  startColumn: start.column,
                  endLineNumber: end.lineNumber,
                  endColumn: end.column,
                },
                options: {
                  className:
                    "yRemoteSelection yRemoteSelection-" + clientID,
                  afterContentClassName,
                  beforeContentClassName,
                },
              });
            }
          }
        });

        decorationIds = monacoEditor.deltaDecorations(
          decorationIds,
          newDecorations,
        );
      };

      // Wrap to prevent recursive deltaDecorations errors
      const safeRerenderDecorations = () => {
        if (isRerendering) {
          requestAnimationFrame(rerenderDecorations);
          return;
        }
        isRerendering = true;
        try {
          rerenderDecorations();
        } finally {
          isRerendering = false;
        }
      };

      awareness.on("change", safeRerenderDecorations);

      // Immediately render any remote cursors that are already in awareness
      // state at bind time.  Without this initial pass, a machine that opens
      // the file AFTER other peers are already editing will not see their
      // cursors until those peers next move — their existing position is
      // invisible to the late-joiner.
      safeRerenderDecorations();

      // 3. Also re-render decorations after each Y.Text change so that
      //    remote cursors update positions as content shifts.
      const ytextDecorObserver = () => {
        safeRerenderDecorations();
      };
      ytext.observe(ytextDecorObserver);

      // ─── Monkey-patch destroy() ──────────────────────────────────
      // Make it idempotent AND properly clean up our cursor handlers.
      const originalDestroy = binding.destroy.bind(binding);
      let destroyed = false;
      binding.destroy = () => {
        if (destroyed) return;
        destroyed = true;

        // Clean up our own cursor awareness handlers
        cursorDisposer.dispose();
        awareness.off("change", safeRerenderDecorations);
        ytext.unobserve(ytextDecorObserver);
        // Clear decorations
        try {
          decorationIds = monacoEditor.deltaDecorations(decorationIds, []);
        } catch {
          // editor may already be disposed
        }

        originalDestroy();
        // Also null-out our ref so safeDestroyBinding() becomes a no-op
        if (bindingRef.current === binding) {
          bindingRef.current = null;
        }
      };

      bindingRef.current = binding;
      currentFileRef.current = filePath;
      currentEditorRef.current = monacoEditor;

      console.log(`Bound editor to collaborative document: ${docName}`);
    },
    [],
  );

  const unbindEditor = useCallback((filePath?: string) => {
    // If a specific filePath is provided, ONLY unbind if it matches the current file
    if (filePath && currentFileRef.current !== filePath) {
      console.log(`unbindEditor: ignoring request to unbind ${filePath} because active is ${currentFileRef.current}`);
      return;
    }

    safeDestroyBinding();
    currentFileRef.current = null;
    currentEditorRef.current = null;
  }, [safeDestroyBinding]);

  // Get current editor content (for saving during collaboration)
  const getCurrentEditorContent = useCallback((): string | null => {
    if (!currentEditorRef.current) return null;
    const model = currentEditorRef.current.getModel();
    return model ? model.getValue() : null;
  }, []);

  // Helper to derive a consistent relative path across OSes
  const toRelativePath = (fullPath: string, rootPath: string): string => {
    // Normalize paths to use forward slashes and remove trailing slashes
    const normalizedFullPath = fullPath.replace(/\\/g, "/").replace(/\/+$/, "");
    const normalizedRootPath = rootPath.replace(/\\/g, "/").replace(/\/+$/, "");

    // Ensure rootPath is a prefix of fullPath (case-insensitive for robustness)
    if (normalizedFullPath.toLowerCase().startsWith(normalizedRootPath.toLowerCase())) {
      let relative = normalizedFullPath.substring(normalizedRootPath.length);
      // Remove any leading slash if present
      if (relative.startsWith("/")) {
        relative = relative.substring(1);
      }
      return relative;
    }
    // If not a sub-path, return the full path as is
    return fullPath;
  };

  // Get the latest collaborative content for a file from the Yjs document.
  // This is used when an inactive tab becomes active to show the up-to-date
  // content instead of stale React state.
  const getFileContent = useCallback(
    (filePath: string, workspaceRoot?: string): string | null => {
      if (!ydocRef.current) return null;

      // Calculate relative path to construct docName
      let relativePath = filePath;
      if (workspaceRoot) {
        relativePath = toRelativePath(filePath, workspaceRoot);
      }
      const docName = relativePath.replace(/[^a-zA-Z0-9]/g, "_");

      const ytext = ydocRef.current.getText(docName);
      const content = ytext.toString();
      // Return null if the Y.Text is empty (file hasn't been shared yet)
      return content.length > 0 ? content : null;
    },
    [],
  );

  // Directly initialize or overwrite the collaborative content for a file.
  // This is critical when an external file creation (e.g. undoing a file deletion)
  // brings a file back with content. It ensures the Yjs document reflects the
  // disk content even if nobody has bound an editor to it yet.
  const setFileContent = useCallback(
    (filePath: string, content: string, workspaceRoot?: string) => {
      if (!ydocRef.current) return;

      let relativePath = filePath;
      if (workspaceRoot) {
        relativePath = toRelativePath(filePath, workspaceRoot);
      }
      const docName = relativePath.replace(/[^a-zA-Z0-9]/g, "_");

      const ytext = ydocRef.current.getText(docName);
      if (ytext.toString() !== content) {
        // Use a single transaction so MonacoBinding sees one atomic update
        // instead of a delete followed by an insert (which would flash empty).
        ydocRef.current.transact(() => {
          ytext.delete(0, ytext.length);
          if (content.length > 0) {
            ytext.insert(0, content);
          }
        });
      }
    },
    [],
  );

  // Share a file with all connected users
  const shareFile = useCallback((file: SharedFile) => {
    if (!ydocRef.current) {
      console.warn("Cannot share file: No Yjs document");
      return;
    }
    const sharedFilesMap = ydocRef.current.getMap<SharedFile>("sharedFiles");
    console.log(`Sharing file: ${file.name}`);
    sharedFilesMap.set(file.path, file);
  }, []);

  // Get all shared files
  const getSharedFiles = useCallback((): SharedFile[] => {
    if (!ydocRef.current) return [];
    const sharedFilesMap = ydocRef.current.getMap<SharedFile>("sharedFiles");
    return Array.from(sharedFilesMap.values());
  }, []);

  // Set the active shared file (syncs to all users)
  const setActiveSharedFile = useCallback((path: string) => {
    if (!ydocRef.current) {
      console.warn("Cannot set active file: No Yjs document");
      return;
    }
    const activeFileText = ydocRef.current.getText("activeFile");
    ydocRef.current.transact(() => {
      activeFileText.delete(0, activeFileText.length);
      activeFileText.insert(0, path);
    });
  }, []);

  // Subscribe to shared files changes
  const onSharedFilesChange = useCallback(
    (callback: (files: SharedFile[]) => void) => {
      sharedFilesCallbacksRef.current.add(callback);
      // Immediately call with current files if available
      if (ydocRef.current) {
        const files = getSharedFiles();
        if (files.length > 0) {
          callback(files);
        }
      }
      return () => {
        sharedFilesCallbacksRef.current.delete(callback);
      };
    },
    [getSharedFiles],
  );

  // Subscribe to active file changes
  const onActiveFileChange = useCallback(
    (callback: (path: string | null) => void) => {
      activeFileCallbacksRef.current.add(callback);
      // Immediately call with current active file if available
      if (activeSharedFile) {
        callback(activeSharedFile);
      }
      return () => {
        activeFileCallbacksRef.current.delete(callback);
      };
    },
    [activeSharedFile],
  );

  // Set the shared workspace (syncs to all users)
  const setSharedWorkspace = useCallback((path: string) => {
    if (!ydocRef.current) {
      console.warn("Cannot set shared workspace: No Yjs document");
      return;
    }
    const workspaceText = ydocRef.current.getText("sharedWorkspace");
    ydocRef.current.transact(() => {
      workspaceText.delete(0, workspaceText.length);
      workspaceText.insert(0, path);
    });
    console.log("Set shared workspace:", path);
  }, []);

  // Subscribe to workspace changes
  const onWorkspaceChange = useCallback(
    (callback: (path: string | null) => void) => {
      workspaceCallbacksRef.current.add(callback);
      // Immediately call with current workspace if available
      if (sharedWorkspace) {
        callback(sharedWorkspace);
      }
      return () => {
        workspaceCallbacksRef.current.delete(callback);
      };
    },
    [sharedWorkspace],
  );

  // Broadcast a file operation to all connected peers
  const broadcastFileOp = useCallback(
    (op: Omit<FileOperation, "timestamp" | "clientId">) => {
      if (!ydocRef.current || !providerRef.current) {
        console.warn("broadcastFileOp: skipped — no active Yjs session", op.type, op.relativePath);
        return;
      }
      const fileOpsArray = ydocRef.current.getArray<FileOperation>("fileOps");
      // Normalize all paths to forward slashes for cross-platform compatibility
      const fullOp: FileOperation = {
        ...op,
        relativePath: op.relativePath.replace(/\\/g, "/"),
        newRelativePath: op.newRelativePath?.replace(/\\/g, "/"),
        timestamp: Date.now(),
        clientId: providerRef.current.awareness.clientID,
      };
      fileOpsArray.push([fullOp]);
      console.log(
        "Broadcast file operation:",
        fullOp.type,
        fullOp.relativePath,
      );
    },
    [],
  );

  // Subscribe to file operations from other peers
  const onFileOperation = useCallback(
    (callback: (op: FileOperation) => void) => {
      fileOpCallbacksRef.current.add(callback);
      return () => {
        fileOpCallbacksRef.current.delete(callback);
      };
    },
    [],
  );

  // Subscribe to raw remote Y.Text edits (bypasses EditorUI)
  const onRemoteContentChange = useCallback(
    (callback: (docName: string) => void) => {
      remoteContentCallbacksRef.current.add(callback);
      return () => {
        remoteContentCallbacksRef.current.delete(callback);
      };
    },
    [],
  );

  // Share workspace with files (for syncing entire folder to clients)
  const shareWorkspaceWithFiles = useCallback(
    (path: string, files: WorkspaceFile[]) => {
      if (!ydocRef.current) {
        console.warn("Cannot share workspace with files: No Yjs document");
        return;
      }
      const workspaceMetadataMap =
        ydocRef.current.getMap<WorkspaceMetadata>("workspaceMetadata");
      const folderName = path.split(/[/\\]/).pop() || "workspace";
      // Normalize all file relative paths to forward slashes for cross-platform compatibility
      const normalizedFiles = files.map((f) => ({
        ...f,
        relativePath: f.relativePath.replace(/\\/g, "/"),
      }));
      const metadata: WorkspaceMetadata = {
        folderName,
        hostPath: path,
        files: normalizedFiles,
      };
      workspaceMetadataMap.set("current", metadata);
      console.log(
        `Shared workspace "${folderName}" with ${files.length} files`,
      );
    },
    [],
  );

  // Keep a ref in sync with the latest workspaceMetadata so that
  // onWorkspaceMetadataChange can read it without depending on the state
  // (which would recreate the callback and cause consumers to re-subscribe).
  const workspaceMetadataRef = useRef<WorkspaceMetadata | null>(workspaceMetadata);
  workspaceMetadataRef.current = workspaceMetadata;

  // Subscribe to workspace metadata changes
  const onWorkspaceMetadataChange = useCallback(
    (callback: (metadata: WorkspaceMetadata | null) => void) => {
      workspaceMetadataCallbacksRef.current.add(callback);
      // Immediately call with current metadata if available
      const current = workspaceMetadataRef.current;
      if (current) {
        callback(current);
      }
      return () => {
        workspaceMetadataCallbacksRef.current.delete(callback);
      };
    },
    [],  // stable — never recreated
  );

  const isActive = status?.isActive || false;

  // Memoize the context value to prevent unnecessary re-renders of consumers.
  // Without this, every state change in the provider (e.g. from awareness
  // updates) creates a new object reference, causing ALL useCollaboration()
  // consumers to re-render — which cascades into FileTree/EditorPanel
  // re-renders that steal focus from inline inputs on Windows.
  const value: CollaborationContextValue = useMemo(
    () => ({
      isActive,
      status,
      connectedUsers,
      userName,
      setUserName,
      startHost,
      joinSession,
      stopSession,
      onBeforeSessionStop,
      bindEditor,
      unbindEditor,
      getCurrentEditorContent,
      getFileContent,
      setFileContent,
      ydoc: ydocRef.current,
      provider: providerRef.current,
      // Shared file methods
      shareFile,
      getSharedFiles,
      setActiveSharedFile,
      activeSharedFile,
      onSharedFilesChange,
      onActiveFileChange,
      // Workspace sharing
      sharedWorkspace,
      setSharedWorkspace,
      onWorkspaceChange,
      // Workspace sync (with files)
      shareWorkspaceWithFiles,
      workspaceMetadata,
      onWorkspaceMetadataChange,
      // File operation sync
      broadcastFileOp,
      onFileOperation,
      onRemoteContentChange,
      connectionError,
      clearConnectionError: () => setConnectionError(null),
    }),
    [
      isActive,
      status,
      connectedUsers,
      userName,
      setUserName,
      startHost,
      joinSession,
      stopSession,
      onBeforeSessionStop,
      bindEditor,
      unbindEditor,
      getCurrentEditorContent,
      getFileContent,
      shareFile,
      getSharedFiles,
      setActiveSharedFile,
      activeSharedFile,
      onSharedFilesChange,
      onActiveFileChange,
      sharedWorkspace,
      setSharedWorkspace,
      onWorkspaceChange,
      shareWorkspaceWithFiles,
      workspaceMetadata,
      onWorkspaceMetadataChange,
      broadcastFileOp,
      onFileOperation,
      onRemoteContentChange,
      connectionError,
    ],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration(): CollaborationContextValue {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider",
    );
  }
  return context;
}
