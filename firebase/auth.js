// firebase/auth.js
// Custom OTP + Anonymous Firebase Auth
// Anonymous sign-in → request.auth != null → Firestore rules pass

import { signOut, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth, db } from './config';

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

let _otp    = null;
let _phone  = null;
let _expiry = null;

const makeOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (phoneNumber) => {
  _phone  = phoneNumber;
  _otp    = makeOTP();
  _expiry = Date.now() + 10 * 60 * 1000; // 10 min

  // Save OTP in Firestore (non-blocking, best-effort)
  setDoc(doc(db, 'otpSessions', phoneNumber.replace(/\+/g, '')), {
    otp: _otp, phone: phoneNumber,
    expiresAt: _expiry, createdAt: serverTimestamp(),
  }).catch(() => {});

  // OTP visible in Metro terminal during development
  console.log('\n==========================');
  console.log('📱 OTP:', _otp, '| Phone:', phoneNumber);
  console.log('==========================\n');

  return { otp: _otp };
};

export const verifyOTP = async (inputOTP) => {
  if (!_phone || !_otp)         throw new Error('No OTP session. Tap Get OTP again.');
  if (Date.now() > _expiry)     throw new Error('OTP expired. Request a new one.');
  if (inputOTP.trim() !== _otp) throw new Error('Wrong OTP. Try again.');

  const phone = _phone;
  // Stable UID: same phone always same UID
  const uid   = 'p' + phone.replace(/\D/g, '');

  // Sign in anonymously → request.auth != null in Firestore rules
  try {
    const auth = getFirebaseAuth();
    await signInAnonymously(auth);
  } catch (e) {
    console.warn('[Auth] Anonymous sign-in failed:', e.code, e.message);
    // If anonymous auth disabled → use open Firestore rules (allow read, write: if true)
  }

  await AsyncStorage.multiSet([[KEY_UID, uid], [KEY_PHONE, phone]]);
  _otp = _phone = _expiry = null;

  return { uid, phoneNumber: phone };
};

export const logout = async () => {
  _otp = _phone = _expiry = null;
  await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]);
  try { await signOut(getFirebaseAuth()); } catch {}
};

export const getStoredUser = async () => {
  try {
    const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);
    return uid ? { uid, phoneNumber: phone } : null;
  } catch { return null; }
};
