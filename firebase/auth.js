// firebase/auth.js
import { signOut, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, db } from './config';

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

let _otp    = null;
let _phone  = null;
let _expiry = null;

const makeOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── Send OTP ──────────────────────────────────────────────────────────────
export const sendOTP = async (phoneNumber) => {
  _phone  = phoneNumber;
  _otp    = makeOTP();
  _expiry = Date.now() + 10 * 60 * 1000;

  // Save OTP to Firestore (non-blocking)
  setDoc(doc(db, 'otpSessions', phoneNumber.replace(/\+/g, '')), {
    otp: _otp, phone: phoneNumber,
    expiresAt: _expiry, createdAt: serverTimestamp(),
  }).catch(() => {});

  console.log('\n============================');
  console.log('📱 OTP:', _otp, '| Phone:', phoneNumber);
  console.log('============================\n');

  return { otp: _otp };
};

// ── Verify OTP ────────────────────────────────────────────────────────────
export const verifyOTP = async (inputOTP) => {
  if (!_phone || !_otp)         throw new Error('No OTP session. Tap Get OTP again.');
  if (Date.now() > _expiry)     throw new Error('OTP expired. Request a new one.');
  if (inputOTP.trim() !== _otp) throw new Error('Wrong OTP. Try again.');

  const phone = _phone;
  const uid   = 'p' + phone.replace(/\D/g, '');

  // ── KEY FIX: Sign in anonymously so request.auth != null ─────────────
  // This makes Firestore rules work — request.auth.uid = Firebase UID
  try {
    const auth = getFirebaseAuth();
    await signInAnonymously(auth);
  } catch (e) {
    console.warn('Anonymous auth failed:', e.message);
    // Continue anyway — Firestore rules must be open (allow read, write: if true)
  }

  await AsyncStorage.multiSet([[KEY_UID, uid], [KEY_PHONE, phone]]);

  _otp = _phone = _expiry = null;

  return { uid, phoneNumber: phone };
};

// ── Logout ────────────────────────────────────────────────────────────────
export const logout = async () => {
  _otp = _phone = _expiry = null;
  await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]);
  try { await signOut(getFirebaseAuth()); } catch {}
};

// ── Get stored user ───────────────────────────────────────────────────────
export const getStoredUser = async () => {
  try {
    const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);
    return uid ? { uid, phoneNumber: phone } : null;
  } catch { return null; }
};
