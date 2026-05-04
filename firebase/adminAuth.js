// firebase/adminAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin Email + Password authentication
// Separate from the phone OTP used by farmers/owners
//
// SETUP (one-time in Firebase Console):
//   Authentication → Sign-in method → Email/Password → Enable
//   Authentication → Users → Add User → admin@nammaVayal.com + password
// ─────────────────────────────────────────────────────────────────────────────

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, db } from './config';

const KEY_ADMIN_UID   = '@vayal_admin_uid';
const KEY_ADMIN_EMAIL = '@vayal_admin_email';

// ── Admin Login with Email + Password ─────────────────────────────────────
export const adminLogin = async (email, password) => {
  const auth = getFirebaseAuth();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) throw new Error('Email is required');
  if (!password)     throw new Error('Password is required');

  // Firebase email/password sign in
  const userCredential = await signInWithEmailAndPassword(
    auth, trimmedEmail, password
  );
  const firebaseUser = userCredential.user;

  // Verify this UID has admin role in Firestore
  const snap = await getDoc(doc(db, 'users', firebaseUser.uid));

  let profile;
  if (snap.exists() && snap.data().role === 'admin') {
    // Existing admin profile
    profile = { id: firebaseUser.uid, ...snap.data() };
  } else {
    // First login — auto-create admin profile in Firestore
    profile = {
      role:      'admin',
      email:     trimmedEmail,
      name:      'Admin',
      phone:     '',
      isAdmin:   true,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), profile, { merge: true });
    profile = { id: firebaseUser.uid, ...profile };
  }

  // Persist admin session
  await AsyncStorage.multiSet([
    [KEY_ADMIN_UID,   firebaseUser.uid],
    [KEY_ADMIN_EMAIL, trimmedEmail],
  ]);

  return { uid: firebaseUser.uid, email: trimmedEmail, profile };
};

// ── Admin Logout ───────────────────────────────────────────────────────────
export const adminLogout = async () => {
  const auth = getFirebaseAuth();
  await AsyncStorage.multiRemove([KEY_ADMIN_UID, KEY_ADMIN_EMAIL]);
  try { await signOut(auth); } catch { /* ignore */ }
};

// ── Get stored admin session ───────────────────────────────────────────────
export const getStoredAdmin = async () => {
  try {
    const [[, uid], [, email]] = await AsyncStorage.multiGet([
      KEY_ADMIN_UID, KEY_ADMIN_EMAIL,
    ]);
    return uid ? { uid, email } : null;
  } catch { return null; }
};

// ── Check if current Firebase user is admin ────────────────────────────────
export const isAdminUser = async (uid) => {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && snap.data().role === 'admin';
  } catch { return false; }
};
