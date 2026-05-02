// utils/network.js
// Network connectivity monitor
// Shows offline banner when no internet
// Auto-retries Firestore when connection restores

import { useState, useEffect } from 'react';
import { goOnline } from '../firebase/firestore';

// Simple fetch-based connectivity check
// Works without any extra package
export async function checkConnectivity() {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// React hook — returns isConnected boolean
// Polls every 10 seconds and on mount
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let timer;

    const check = async () => {
      const connected = await checkConnectivity();
      setIsConnected(prev => {
        if (!prev && connected) {
          // Just came back online — re-enable Firestore network
          goOnline();
        }
        return connected;
      });
    };

    check();
    timer = setInterval(check, 10_000);
    return () => clearInterval(timer);
  }, []);

  return isConnected;
}
