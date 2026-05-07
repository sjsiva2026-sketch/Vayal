// firebase/config.js
// ─────────────────────────────────────────────────────────────────────────────
// FRESH FIREBASE SETUP — New Firestore DB (Blaze Plan)
// Project:  vayal-33b12
// Package:  com.vayal.app
// Bucket:   vayal-33b12.firebasestorage.app
//
// KEY RULES:
//  • NO experimentalFlags — causes INTERNAL ASSERTION FAILED on React Native
//  • Plain getFirestore(app) — works perfectly on firebase ^10.8
//  • Anonymous signIn for Firestore rules (request.auth != null)
//  • AsyncStorage persistence for auth sessions
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage }   from 'firebase/storage';
import AsyncStorage     from '@react-native-async-storage/async-storage';

// ── Exact values from google-services.json ─────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4',
  authDomain:        'vayal-33b12.firebaseapp.com',
  projectId:         'vayal-33b12',
  storageBucket:     'vayal-33b12.firebasestorage.app',
  messagingSenderId: '881016543795',
  appId:             '1:881016543795:android:d567faf49f9def975de146',
};

// ── Singleton app ──────────────────────────────────────────────────────────
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApp();

// ── Auth — AsyncStorage keeps user logged in after app restart ─────────────
let _auth = null;
export const getFirebaseAuth = () => {
  if (_auth) return _auth;
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized
    _auth = getAuth(app);
  }
  return _auth;
};

// ── Firestore — plain, no flags ────────────────────────────────────────────
export const db = getFirestore(app);

// ── Storage — Blaze plan required ─────────────────────────────────────────
export const storage = getStorage(app);

export default app;
