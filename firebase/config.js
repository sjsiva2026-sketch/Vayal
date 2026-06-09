// firebase/config.js
// Project:  vayal-33b12  |  Package: com.vayal.app  |  Plan: Blaze
//
// Rules:
//  • NO experimentalFlags — causes INTERNAL ASSERTION FAILED on React Native
//  • getFirestore(app) plain — works on firebase ^10.8
//  • initializeAuth with getReactNativePersistence(AsyncStorage)
//    → user stays logged in across app restarts, no re-OTP needed

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

// Singleton — safe across HMR and multiple imports
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// Auth with AsyncStorage persistence
// initializeAuth throws if called twice → fall back to getAuth()
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

// Firestore — no flags, no experimentalLongPolling
export const db = getFirestore(app);

// Storage — Blaze plan required for uploads
export const storage = getStorage(app);

export default app;
