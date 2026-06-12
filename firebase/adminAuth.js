// firebase/adminAuth.js
// Only ONE specific email can login as admin.
// வேற எந்த email-உம் login ஆகவே முடியாது — code + rules இரண்டிலயும் block.

import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, db } from './config';

// ── உங்க admin email இங்க மாத்துங்க ─────────────────────────────────────
const ADMIN_EMAIL = 'sjsiva2026@gmail.com';
// ─────────────────────────────────────────────────────────────────────────

const KEY_ADMIN_UID   = '@vayal_admin_uid';
const KEY_ADMIN_EMAIL = '@vayal_admin_email';

export const adminLogin = async (email, password) => {
  const auth         = getFirebaseAuth();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) throw new Error('Email is required');
  if (!password)     throw new Error('Password is required');

  // ── Specific email check — வேற எந்த email-உம் block ──────────────────
  if (trimmedEmail !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Access denied. You are not authorized to login as admin.');
  }

  // Firebase sign in
  const cred         = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  const firebaseUser = cred.user;

  // Double-check: Firestore-லயும் role == 'admin' confirm
  const snap = await getDoc(doc(db, 'users', firebaseUser.uid));

  let profile;
  if (snap.exists() && snap.data().role === 'admin') {
    profile = { id: firebaseUser.uid, ...snap.data() };
  } else {
    // First login — admin doc create
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

  await AsyncStorage.multiSet([
    [KEY_ADMIN_UID,   firebaseUser.uid],
    [KEY_ADMIN_EMAIL, trimmedEmail],
  ]);

  return { uid: firebaseUser.uid, email: trimmedEmail, profile };
};

export const adminLogout = async () => {
  const auth = getFirebaseAuth();
  await AsyncStorage.multiRemove([KEY_ADMIN_UID, KEY_ADMIN_EMAIL]);
  try { await signOut(auth); } catch {}
};

export const getStoredAdmin = async () => {
  try {
    const [[, uid], [, email]] = await AsyncStorage.multiGet([
      KEY_ADMIN_UID, KEY_ADMIN_EMAIL,
    ]);
    return uid ? { uid, email } : null;
  } catch { return null; }
};

export const isAdminUser = async (uid) => {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && snap.data().role === 'admin';
  } catch { return false; }
};
