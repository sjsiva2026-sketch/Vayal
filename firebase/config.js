// firebase/config.js
// Project : vayal-33b12  |  Package: com.vayal.app  |  Plan: Blaze
// SDK     : firebase@10.14.1
//
// Rules:
//  • initializeAuth at module-load time (NOT lazily) — lazy init caused
//    "Cannot read property of undefined" crash on first OTP attempt
//  • getReactNativePersistence(AsyncStorage) — session survives app restarts
//  • No experimentalLongPolling on Firestore — causes INTERNAL ASSERTION FAILED
//  • expo-firebase-recaptcha is NOT used — deprecated since Expo SDK 48
//    Firebase uses Google Play Integrity / SafetyNet on Android automatically

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

// ── Firebase App singleton ────────────────────────────────────────────────
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// ── Auth — eager init at module load, NOT inside a getter function ────────
// Problem: lazy init (inside getFirebaseAuth()) means _auth is undefined
// the first time signInWithPhoneNumber() is called if the module loads
// before AsyncStorage is ready, giving:
//   "Cannot read property 'verify' of undefined"   ← the error you saw
//
// Fix: initialize synchronously at module level.
// initializeAuth throws "already initialized" on HMR → catch + fallback.
let _auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}

// Named export for files that import { auth }
export const auth = _auth;

// Getter kept for backwards compat with files using getFirebaseAuth()
export const getFirebaseAuth = () => _auth;

// ── Firestore ─────────────────────────────────────────────────────────────
export const db = getFirestore(app);

// ── Storage ───────────────────────────────────────────────────────────────
export const storage = getStorage(app);

export default app;
