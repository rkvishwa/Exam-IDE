import { useEffect, useRef } from 'react';
import { addActivityEvent } from '../services/activityLogger';

/**
 * Tracks user activity: online/offline status changes, app focus/blur (switching),
 * active window detection, and clipboard copy events with timestamps.
 * Call this hook once when the user is logged into the IDE.
 */
export function useActivityLogger(isActive: boolean) {
  const wasOnlineRef = useRef(navigator.onLine);
  const isFocusedRef = useRef(true);
  const activeWindowPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActiveWindowRef = useRef<string>('');
  const lastInternalCopyRef = useRef<string>('');

  useEffect(() => {
    if (!isActive) return;

    // Log initial status
    addActivityEvent({
      type: navigator.onLine ? 'status_online' : 'status_offline',
      timestamp: new Date().toISOString(),
      details: 'Session started',
    });

    // --- Online/Offline tracking via main process (more reliable) ---
    let cleanupNetworkListener: (() => void) | undefined;
    if (window.electronAPI?.network) {
      // First update to exact status on mount
      window.electronAPI.network.getStatus().then((status) => {
        wasOnlineRef.current = status;
      }).catch(() => {});

      cleanupNetworkListener = window.electronAPI.network.onStatusChange((status: boolean) => {
        if (status && !wasOnlineRef.current) {
          addActivityEvent({
            type: 'status_online',
            timestamp: new Date().toISOString(),
            details: 'Network connection restored',
          });
        } else if (!status && wasOnlineRef.current) {
          addActivityEvent({
            type: 'status_offline',
            timestamp: new Date().toISOString(),
            details: 'Network connection lost',
          });
        }
        wasOnlineRef.current = status;
      });
    } else {
      // Fallback to browser events for non-Electron
      const handleOnline = () => {
        if (!wasOnlineRef.current) {
          addActivityEvent({
            type: 'status_online',
            timestamp: new Date().toISOString(),
            details: 'Network connection restored',
          });
        }
        wasOnlineRef.current = true;
      };

      const handleOffline = () => {
        if (wasOnlineRef.current) {
          addActivityEvent({
            type: 'status_offline',
            timestamp: new Date().toISOString(),
            details: 'Network connection lost',
          });
        }
        wasOnlineRef.current = false;
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      cleanupNetworkListener = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // --- Active window polling (detects what app user switched to) ---
    const pollActiveWindow = async () => {
      if (isFocusedRef.current) return; // only poll when IDE is not focused
      try {
        const title = await window.electronAPI?.system?.getActiveWindow();
        // null means it's our own app window — skip
        if (!title) return;
        if (title !== lastActiveWindowRef.current) {
          lastActiveWindowRef.current = title;
          addActivityEvent({
            type: 'app_blur',
            timestamp: new Date().toISOString(),
            details: `Active app: ${title}`,
          });
        }
      } catch {
        // ignore polling errors
      }
    };

    const startPolling = () => {
      if (activeWindowPollRef.current) return;
      activeWindowPollRef.current = setInterval(pollActiveWindow, 3000);
    };

    const stopPolling = () => {
      if (activeWindowPollRef.current) {
        clearInterval(activeWindowPollRef.current);
        activeWindowPollRef.current = null;
      }
    };

    // --- App focus/blur tracking ---
    const handleWindowBlur = async () => {
      if (!isFocusedRef.current) return; // already blurred
      isFocusedRef.current = false;

      // Immediately try to get active window title
      let switchedTo = '';
      try {
        // Small delay to let the OS switch focus
        await new Promise(r => setTimeout(r, 300));
        const title = await window.electronAPI?.system?.getActiveWindow();
        // null means focus went to our own app (e.g. iframe/webview/preview click)
        if (!title) {
          isFocusedRef.current = true; // treat as still focused
          return; // skip logging — not a real app switch
        }
        switchedTo = title;
        lastActiveWindowRef.current = title;
      } catch { /* ignore */ }

      addActivityEvent({
        type: 'app_blur',
        timestamp: new Date().toISOString(),
        details: switchedTo ? `Switched to: ${switchedTo}` : 'IDE window lost focus',
      });

      startPolling();
    };

    const handleWindowFocus = () => {
      if (isFocusedRef.current) return; // already focused
      isFocusedRef.current = true;
      lastActiveWindowRef.current = '';
      stopPolling();

      addActivityEvent({
        type: 'app_focus',
        timestamp: new Date().toISOString(),
        details: 'User returned to IDE',
      });
    };

    // --- Clipboard copy/paste tracking ---
    let lastCopyLogTime = 0;
    let lastPasteLogTime = 0;
    const DEBOUNCE_MS = 400;

    // Immediately record what was selected (synchronous) so paste comparison works
    // even if paste happens before the async clipboard read completes
    const recordInternalCopy = () => {
      const selection = document.getSelection()?.toString()?.trim();
      if (selection) {
        lastInternalCopyRef.current = selection;
      }
    };

    const logCopy = (text: string) => {
      const now = Date.now();
      if (now - lastCopyLogTime < DEBOUNCE_MS) return;
      if (!text.trim()) return;
      lastCopyLogTime = now;
      // Update ref with authoritative clipboard text
      lastInternalCopyRef.current = text.trim();
      addActivityEvent({
        type: 'clipboard_copy',
        timestamp: new Date().toISOString(),
        details: text,
      });
    };

    const logPaste = (text: string) => {
      const now = Date.now();
      if (now - lastPasteLogTime < DEBOUNCE_MS) return;
      if (!text.trim()) return;
      lastPasteLogTime = now;
      if (text.trim() !== lastInternalCopyRef.current) {
        addActivityEvent({
          type: 'clipboard_paste_external',
          timestamp: new Date().toISOString(),
          details: `Copied from outside: ${text}`,
        });
      }
    };

    // Native copy/cut event (capture phase)
    const handleCopyEvent = () => {
      // Immediately store selection so paste comparison works even if paste is instant
      recordInternalCopy();
      // Then read the actual clipboard for authoritative logging
      setTimeout(async () => {
        try {
          const text = await window.electronAPI?.clipboard?.readText();
          if (text) {
            logCopy(text);
            return;
          }
        } catch { /* ignore */ }
        const selection = document.getSelection()?.toString();
        if (selection) logCopy(selection);
      }, 100);
    };

    // Native paste event (capture phase - clipboardData is available synchronously)
    const handlePasteEvent = (e: Event) => {
      const ce = e as ClipboardEvent;
      const text = ce.clipboardData?.getData('text/plain');
      if (text) {
        logPaste(text);
        return;
      }
      // Fallback: read clipboard via Electron API
      (async () => {
        try {
          const t = await window.electronAPI?.clipboard?.readText();
          if (t) logPaste(t);
        } catch { /* ignore */ }
      })();
    };

    // Keydown handler as fallback for Ctrl+C/X/V (in case native events don't fire)
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X') {
        // Immediately store selection so paste comparison works
        recordInternalCopy();
        // Read clipboard after the copy/cut completes for proper logging
        setTimeout(async () => {
          try {
            const text = await window.electronAPI?.clipboard?.readText();
            if (text) {
              logCopy(text);
              return;
            }
          } catch { /* ignore */ }
          const selection = document.getSelection()?.toString();
          if (selection) logCopy(selection);
        }, 150);
      }
      if (e.key === 'v' || e.key === 'V') {
        (async () => {
          try {
            const text = await window.electronAPI?.clipboard?.readText();
            if (text) logPaste(text);
          } catch { /* ignore */ }
        })();
      }
    };

    // Listen for copy events from the preview webview
    const handleWebviewCopy = (e: Event) => {
      const text = (e as CustomEvent).detail;
      if (text && typeof text === 'string' && text.trim()) {
        logCopy(text);
      }
    };

    document.addEventListener('copy', handleCopyEvent, true);
    document.addEventListener('cut', handleCopyEvent, true);
    document.addEventListener('paste', handlePasteEvent, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('webview-copy', handleWebviewCopy);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('copy', handleCopyEvent, true);
      document.removeEventListener('cut', handleCopyEvent, true);
      document.removeEventListener('paste', handlePasteEvent, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('webview-copy', handleWebviewCopy);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      stopPolling();
      cleanupNetworkListener?.();
    };
  }, [isActive]);
}
