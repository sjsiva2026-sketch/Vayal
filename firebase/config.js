// firebase/config.js
// ─────────────────────────────────────────────────────────────────────────────
// FINAL FIX for "Could not reach Cloud Firestore backend"
//
// ROOT CAUSES (all fixed here):
// 1. experimentalAutoDetectLongPolling removed in firebase ^10.x — causes
//    "INTERNAL ASSERTION FAILED: Unexpected state"
// 2. Both long-polling flags together → assertion crash
// 3. Anonymous auth failing → Firestore connection drops
//
// SOLUTION:
// • Remove ALL experimental flags — use plain getFirestore() for React Native
// • firebase ^10.8 JS SDK connects fine without any special transport flags
// • Auth uses getReactNativePersistence(AsyncStorage) — stable sessions
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';
import { getStorage }    from 'firebase/storage';
import AsyncStorage      from '@react-native-async-storage/async-storage';

// ── Firebase config — matches google-services.json ────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4',
  authDomain:        'vayal-33b12.firebaseapp.com',
  projectId:         'vayal-33b12',
  storageBucket:     'vayal-33b12.firebasestorage.app',
  messagingSenderId: '881016543795',
  appId:             '1:881016543795:android:d567faf49f9def975de146',
};

// ── App singleton ──────────────────────────────────────────────────────────
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// ── Auth — AsyncStorage persistence ───────────────────────────────────────
let _auth = null;
export const getFirebaseAuth = () => {
  if (_auth) return _auth;
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    _auth = getAuth(app);
  }
  return _auth;
};

// ── Firestore — plain getFirestore, no experimental flags ─────────────────
// firebase ^10.8 React Native works with plain getFirestore()
// No localCache / no experimentalFlags needed — they cause assertion errors
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
