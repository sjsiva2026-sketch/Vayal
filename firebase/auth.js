// firebase/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: Removed signInAnonymously — it requires "Anonymous" auth provider
// to be enabled in Firebase Console. If not enabled → auth/operation-not-allowed
// error which breaks Firestore connection.
//
// We use phone-derived stable UIDs stored in AsyncStorage instead.
// This is simpler, faster, and works without any Firebase Auth config.
// ─────────────────────────────────────────────────────────────────────────────

import { signOut }                     from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage                    from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, db }         from './config';

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
  _expiry = Date.now() + 10 * 60 * 1000; // 10 min

  // Try to save OTP to Firestore (non-blocking — ok if offline)
  setDoc(doc(db, 'otpSessions', phoneNumber.replace(/\+/g, '')), {
    otp: _otp, phone: phoneNumber,
    expiresAt: _expiry, createdAt: serverTimestamp(),
  }).catch(() => {});

  // OTP shown in Metro console during development
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
  // Stable phone-based UID: same user always same UID, survives reinstall
  const uid   = 'p' + phone.replace(/\D/g, '');

  // Save to AsyncStorage — works fully offline
  await AsyncStorage.multiSet([[KEY_UID, uid], [KEY_PHONE, phone]]);

  // Clear OTP state
  _otp = _phone = _expiry = null;

  // Clean up session doc (non-blocking)
  doc(db, 'otpSessions', phone.replace(/\+/g, ''));

  return { uid, phoneNumber: phone };
};

// ── Logout ────────────────────────────────────────────────────────────────
export const logout = async () => {
  _otp = _phone = _expiry = null;
  await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]);
  try { await signOut(getFirebaseAuth()); } catch {}
};

// ── Get stored user (used on app boot) ───────────────────────────────────
export const getStoredUser = async () => {
  try {
    const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);
    return uid ? { uid, phoneNumber: phone } : null;
  } catch { return null; }
};
