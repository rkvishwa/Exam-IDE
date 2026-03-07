import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type { editor } from "monaco-editor";
import { CollaborationStatus, CollaborationUser } from "../../shared/types";

interface CollaborationContextValue {
  isActive: boolean;
  status: CollaborationStatus | null;
  connectedUsers: CollaborationUser[];
  userName: string;
  setUserName: (name: string) => void;
  startHost: () => Promise<void>;
  joinSession: (hostIp: string) => Promise<void>;
  stopSession: () => Promise<void>;
  bindEditor: (
    monacoEditor: editor.IStandaloneCodeEditor,
    filePath: string,
  ) => void;
  unbindEditor: () => void;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
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
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("collaborationUserName") || "";
  });

  // Refs to store Yjs instances (persist across renders)
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const currentFileRef = useRef<string | null>(null);
  const userColorRef = useRef<string>(generateUserColor());

  // Save username to localStorage when it changes
  useEffect(() => {
    if (userName) {
      localStorage.setItem("collaborationUserName", userName);
    }
  }, [userName]);

  // Subscribe to status changes from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.collaboration.onStatusChange(
      (newStatus) => {
        setStatus(newStatus);
        setConnectedUsers(newStatus.connectedUsers);
      },
    );

    // Get initial status
    window.electronAPI.collaboration.getStatus().then((initialStatus) => {
      setStatus(initialStatus);
      setConnectedUsers(initialStatus.connectedUsers);
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
    // Clean up Monaco binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    // Clean up WebSocket provider
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }

    // Clean up Y.Doc
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    currentFileRef.current = null;
  }, []);

  const initializeYjs = useCallback(
    (hostIp: string, port: number) => {
      // Clean up any existing instances
      cleanup();

      // Create new Yjs document
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      // Connect to WebSocket server
      const wsUrl = `ws://${hostIp}:${port}`;
      console.log("Connecting to WebSocket server:", wsUrl);

      const provider = new WebsocketProvider(wsUrl, "monaco-collab", ydoc, {
        connect: true,
      });
      providerRef.current = provider;

      // Set user awareness information
      provider.awareness.setLocalStateField("user", {
        name: userName,
        color: userColorRef.current,
      });

      // Listen for awareness changes (user list updates)
      provider.awareness.on("change", () => {
        const states = Array.from(provider.awareness.getStates().entries());
        const users: CollaborationUser[] = states
          .filter(([, state]) => state.user)
          .map(([clientId, state]) => ({
            id: String(clientId),
            name: state.user.name,
            color: state.user.color,
          }));
        setConnectedUsers(users);
      });

      // Connection status logging
      provider.on("status", (event: { status: string }) => {
        console.log("WebSocket status:", event.status);
      });

      provider.on("sync", (isSynced: boolean) => {
        console.log("Yjs sync status:", isSynced);
      });

      return { ydoc, provider };
    },
    [cleanup, userName],
  );

  const startHost = useCallback(async () => {
    if (!userName.trim()) {
      throw new Error("Please enter your name");
    }

    try {
      const newStatus =
        await window.electronAPI.collaboration.startHost(userName);

      if (newStatus.hostIp) {
        // Initialize Yjs with local IP (host connects to itself)
        initializeYjs(newStatus.hostIp, newStatus.port);
      }

      setStatus(newStatus);
    } catch (error) {
      console.error("Failed to start host:", error);
      throw error;
    }
  }, [initializeYjs, userName]);

  const joinSession = useCallback(
    async (hostIp: string) => {
      if (!userName.trim()) {
        throw new Error("Please enter your name");
      }
      if (!hostIp.trim()) {
        throw new Error("Please enter the host IP address");
      }

      try {
        const newStatus = await window.electronAPI.collaboration.joinSession(
          hostIp,
          userName,
        );

        // Initialize Yjs connection to remote host
        initializeYjs(hostIp, newStatus.port);

        setStatus(newStatus);
      } catch (error) {
        console.error("Failed to join session:", error);
        throw error;
      }
    },
    [initializeYjs, userName],
  );

  const stopSession = useCallback(async () => {
    try {
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
    (monacoEditor: editor.IStandaloneCodeEditor, filePath: string) => {
      if (!ydocRef.current || !providerRef.current) {
        console.warn("Cannot bind editor: Collaboration not active");
        return;
      }

      // Check if we're already bound to this file
      if (currentFileRef.current === filePath && bindingRef.current) {
        return;
      }

      // Clean up existing binding if switching files
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }

      // Create a sanitized document name from the file path
      // This ensures each file has its own Y.Text type
      const docName = filePath.replace(/[^a-zA-Z0-9]/g, "_");

      // Get or create the Y.Text type for this file
      const ytext = ydocRef.current.getText(docName);

      // Get the Monaco model
      const model = monacoEditor.getModel();
      if (!model) {
        console.warn("Cannot bind editor: No model");
        return;
      }

      // Create the Monaco binding
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([monacoEditor]),
        providerRef.current.awareness,
      );

      bindingRef.current = binding;
      currentFileRef.current = filePath;

      console.log(`Bound editor to collaborative document: ${docName}`);
    },
    [],
  );

  const unbindEditor = useCallback(() => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    currentFileRef.current = null;
  }, []);

  const value: CollaborationContextValue = {
    isActive: status?.isActive || false,
    status,
    connectedUsers,
    userName,
    setUserName,
    startHost,
    joinSession,
    stopSession,
    bindEditor,
    unbindEditor,
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };

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
