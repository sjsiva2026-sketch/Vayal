// utils/network.js — NetInfo இல்லாம simple version
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let netInfo = null;
    try {
      netInfo = require('@react-native-community/netinfo').default;
      const unsub = netInfo.addEventListener(state => {
        setIsConnected(state.isConnected ?? true);
      });
      return unsub;
    } catch {
      // NetInfo not installed — assume connected
      setIsConnected(true);
    }
  }, []);

  return isConnected;
}
