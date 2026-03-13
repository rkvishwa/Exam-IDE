import { useState, useEffect, useCallback } from 'react';

interface NetworkStatusState {
  isOnline: boolean;
  refreshStatus: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatusState {
  const [isOnline, setIsOnline] = useState(false);

  const refreshStatus = useCallback(async (): Promise<boolean> => {
    if (window.electronAPI?.network) {
      try {
        const status = await window.electronAPI.network.getStatus();
        setIsOnline(status);
        return status;
      } catch {
        setIsOnline(false);
        return false;
      }
    }

    const status = navigator.onLine;
    setIsOnline(status);
    return status;
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (window.electronAPI?.network) {
      // Use purely main process HTTP-verified connectivity
      void refreshStatus();
      cleanup = window.electronAPI.network.onStatusChange((status) => setIsOnline(status));
    } else {
      // Fallback for non-Electron environments
      void refreshStatus();
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      cleanup?.();
    };
  }, [refreshStatus]);

  return { isOnline, refreshStatus };
}
