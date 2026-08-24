import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isServerConnected: boolean;
  isFullyConnected: boolean;
  isChecking: boolean;
  latency: number | null;
  lastSuccessfulConnection: Date | null;
  offlineSince: Date | null;
  wasOffline: boolean;
  clearWasOffline: () => void;
  checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastSuccessfulConnection, setLastSuccessfulConnection] = useState<Date | null>(new Date());
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  const prevConnectedRef = useRef<boolean>(true);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsServerConnected(false);
      if (!offlineSince) setOfflineSince(new Date());
      return false;
    }

    setIsChecking(true);
    const startTime = performance.now();

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

      const fetchOptions: RequestInit = {
        method: 'GET',
        cache: 'no-store',
      };
      if (controller) {
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch('/api/health', fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);
      const pingMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        setLatency(pingMs);
        setIsOnline(true);
        setIsServerConnected(true);
        setLastSuccessfulConnection(new Date());
        setOfflineSince(null);

        // If we were previously disconnected and now connected
        if (!prevConnectedRef.current) {
          setWasOffline(true);
          prevConnectedRef.current = true;
        }

        return true;
      } else {
        throw new Error('Server returned non-200');
      }
    } catch {
      setIsServerConnected(false);
      setLatency(null);
      if (!offlineSince) setOfflineSince(new Date());
      prevConnectedRef.current = false;
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [offlineSince]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerConnected(false);
      setOfflineSince(new Date());
      prevConnectedRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', checkConnection);

    // Initial check
    checkConnection();

    // Periodic heartbeat check every 10 seconds (auto-retry while disconnected)
    const interval = setInterval(() => {
      checkConnection();
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', checkConnection);
      clearInterval(interval);
    };
  }, [checkConnection]);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  const isFullyConnected = isOnline && isServerConnected;

  return {
    isOnline,
    isServerConnected,
    isFullyConnected,
    isChecking,
    latency,
    lastSuccessfulConnection,
    offlineSince,
    wasOffline,
    clearWasOffline,
    checkConnection,
  };
}
