import { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from '../context/y-monaco';
import type { editor } from 'monaco-editor';
import { CollaborationStatus, CollaborationUser } from '../../shared/types';

interface UseCollaborationOptions {
  userName: string;
  userColor?: string;
}

interface UseCollaborationReturn {
  isActive: boolean;
  status: CollaborationStatus | null;
  connectedUsers: CollaborationUser[];
  startHost: (userName: string) => Promise<void>;
  joinSession: (hostIp: string, userName: string) => Promise<void>;
  stopSession: () => Promise<void>;
  bindEditor: (monacoEditor: editor.IStandaloneCodeEditor, filePath: string) => void;
  unbindEditor: () => void;
}

// Generate a random color for the user
function generateUserColor(): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function useCollaboration(): UseCollaborationReturn {
  const [status, setStatus] = useState<CollaborationStatus | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  
  // Refs to store Yjs instances (persist across renders)
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const currentFileRef = useRef<string | null>(null);
  const userInfoRef = useRef<{ name: string; color: string }>({ name: '', color: '' });

  // Subscribe to status changes from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.collaboration.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setConnectedUsers(newStatus.connectedUsers);
    });

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

  const initializeYjs = useCallback((hostIp: string, port: number, userName: string) => {
    // Clean up any existing instances
    cleanup();

    // Store user info
    const userColor = generateUserColor();
    userInfoRef.current = { name: userName, color: userColor };

    // Create new Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Connect to WebSocket server
    const wsUrl = `ws://${hostIp}:${port}`;
    const provider = new WebsocketProvider(wsUrl, 'monaco-collab', ydoc);
    providerRef.current = provider;

    // Set user awareness information
    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
    });

    // Listen for awareness changes (user list updates)
    provider.awareness.on('change', () => {
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
    provider.on('status', (event: { status: string }) => {
      console.log('WebSocket status:', event.status);
    });

    return { ydoc, provider };
  }, [cleanup]);

  const startHost = useCallback(async (userName: string) => {
    try {
      const newStatus = await window.electronAPI.collaboration.startHost(userName);
      
      if (newStatus.hostIp) {
        // Initialize Yjs with local IP (host connects to itself)
        initializeYjs(newStatus.hostIp, newStatus.port, userName);
      }
      
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to start host:', error);
      throw error;
    }
  }, [initializeYjs]);

  const joinSession = useCallback(async (hostIp: string, userName: string) => {
    try {
      const newStatus = await window.electronAPI.collaboration.joinSession(hostIp, userName);
      
      // Initialize Yjs connection to remote host
      initializeYjs(hostIp, newStatus.port, userName);
      
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    }
  }, [initializeYjs]);

  const stopSession = useCallback(async () => {
    try {
      cleanup();
      await window.electronAPI.collaboration.stopSession();
      setStatus(null);
      setConnectedUsers([]);
    } catch (error) {
      console.error('Failed to stop session:', error);
      throw error;
    }
  }, [cleanup]);

  const bindEditor = useCallback((monacoEditor: editor.IStandaloneCodeEditor, filePath: string) => {
    if (!ydocRef.current || !providerRef.current) {
      console.warn('Cannot bind editor: Collaboration not active');
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
    const docName = filePath.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Get or create the Y.Text type for this file
    const ytext = ydocRef.current.getText(docName);
    
    // Get the Monaco model
    const model = monacoEditor.getModel();
    if (!model) {
      console.warn('Cannot bind editor: No model');
      return;
    }

    // Create the Monaco binding
    const binding = new MonacoBinding(
      ytext,
      model,
      new Set([monacoEditor]),
      providerRef.current.awareness
    );

    bindingRef.current = binding;
    currentFileRef.current = filePath;

    console.log(`Bound editor to collaborative document: ${docName}`);
  }, []);

  const unbindEditor = useCallback(() => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    currentFileRef.current = null;
  }, []);

  return {
    isActive: status?.isActive || false,
    status,
    connectedUsers,
    startHost,
    joinSession,
    stopSession,
    bindEditor,
    unbindEditor,
  };
}
