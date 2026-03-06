import { useState, useEffect } from 'react';

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (window.electronAPI?.network) {
      // Use purely main process HTTP-verified connectivity
      window.electronAPI.network.getStatus().then((status) => setIsOnline(status)).catch(() => setIsOnline(false));
      cleanup = window.electronAPI.network.onStatusChange((status) => setIsOnline(status));
    } else {
      // Fallback for non-Electron environments
      setIsOnline(navigator.onLine);
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
  }, []);

  return isOnline;
}
