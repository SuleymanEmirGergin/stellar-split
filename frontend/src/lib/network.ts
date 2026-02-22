import { useState, useEffect } from 'react';

/**
 * Returns true when the browser reports no network (navigator.onLine === false).
 * Subscribes to 'online' and 'offline' events for live updates.
 */
export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const setOffline = () => setIsOffline(true);
    const setOnline = () => setIsOffline(false);
    window.addEventListener('offline', setOffline);
    window.addEventListener('online', setOnline);
    return () => {
      window.removeEventListener('offline', setOffline);
      window.removeEventListener('online', setOnline);
    };
  }, []);

  return isOffline;
}
