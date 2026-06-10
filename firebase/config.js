// firebase/config.js
// Project:  vayal-33b12  |  Package: com.vayal.app  |  Plan: Blaze
// Firebase JS SDK: 10.13.2 (locked — do NOT upgrade to v11; breaking RN changes)
//
// Key rules:
//  • No experimentalFlags on getFirestore — causes INTERNAL ASSERTION FAILED
//  • initializeAuth with getReactNativePersistence(AsyncStorage)
//    → session survives app restarts; no re-OTP until logout or token expiry
//  • Singleton guard on both app and auth to survive HMR reloads

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage }   from 'firebase/storage';
import AsyncStorage     from '@react-native-async-storage/async-storage';

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4',
  authDomain:        'vayal-33b12.firebaseapp.com',
  projectId:         'vayal-33b12',
  storageBucket:     'vayal-33b12.firebasestorage.app',
  messagingSenderId: '881016543795',
  appId:             '1:881016543795:android:d567faf49f9def975de146',
};

// ── App singleton ─────────────────────────────────────────────────────────
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// ── Auth singleton with AsyncStorage persistence ──────────────────────────
// initializeAuth() throws "already initialized" on HMR — catch and fall back
let _auth = null;
export const getFirebaseAuth = () => {
  if (_auth) return _auth;
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Auth already initialized (HMR / hot-reload)
    _auth = getAuth(app);
  }
  return _auth;
};

// ── Firestore ─────────────────────────────────────────────────────────────
// No experimentalLongPolling, no experimentalAutoDetectLongPolling
// Both cause "INTERNAL ASSERTION FAILED" on React Native
export const db = getFirestore(app);

// ── Storage (Blaze plan required for file uploads) ────────────────────────
export const storage = getStorage(app);

export default app;
