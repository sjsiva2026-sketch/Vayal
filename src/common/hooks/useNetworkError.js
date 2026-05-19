// src/common/hooks/useNetworkError.js
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

export function useNetworkError() {
  const [isOnline, setIsOnline] = useState(true);

  const handleError = useCallback((e, retry) => {
    const msg = (e?.message || '').toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('offline') ||
      msg.includes('unavailable') ||
      msg.includes('failed to fetch') ||
      msg.includes('timeout')
    ) {
      Alert.alert(
        '📡 No Internet',
        'Check your connection and try again.',
        retry
          ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Retry', onPress: retry }]
          : [{ text: 'OK' }]
      );
    } else if (msg.includes('permission-denied')) {
      Alert.alert('Access Denied', 'You do not have permission for this action.');
    } else if (msg.includes('not-found')) {
      Alert.alert('Not Found', 'Record does not exist.');
    } else if (msg.includes('already-exists')) {
      Alert.alert('Already Exists', 'This record already exists.');
    } else {
      Alert.alert('Error', e?.message || 'Something went wrong. Try again.');
    }
  }, []);

  return { isOnline, handleError };
}
