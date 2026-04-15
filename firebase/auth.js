import { signInAnonymously, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
  _expiry = Date.now() + 10 * 60 * 1000;

  setDoc(doc(db, 'otpSessions', phoneNumber), {
    otp: _otp, phone: phoneNumber,
    expiresAt: _expiry, createdAt: serverTimestamp(),
  }).catch(() => {});

  console.log('\n============================');
  console.log('📱 OTP:', _otp, ' for', phoneNumber);
  console.log('============================\n');

  return { otp: _otp };
};

export const verifyOTP = async (inputOTP) => {
  if (!_phone || !_otp)         throw new Error('No OTP session. Tap Get OTP again.');
  if (Date.now() > _expiry)     throw new Error('OTP expired. Request a new one.');
  if (inputOTP.trim() !== _otp) throw new Error('Wrong OTP. Try again.');

  // BUG FIX: Use a stable phone-based uid so the same user always gets the
  // same uid regardless of how many times they log in. Anonymous auth creates
  // a NEW uid each session, which breaks all Firestore user/booking queries.
  const phone = _phone;
  const uid   = 'p' + phone.replace(/\D/g, '');

  // Still attempt anonymous auth for Firebase security rules compliance,
  // but we ignore its uid and use our stable phone-derived uid instead.
  try {
    const auth = getFirebaseAuth();
    await signInAnonymously(auth);
  } catch (e) {
    console.warn('[Vayal] anon auth skipped:', e.code);
  }

  await AsyncStorage.multiSet([[KEY_UID, uid], [KEY_PHONE, phone]]);
  _otp = _phone = _expiry = null;
  deleteDoc(doc(db, 'otpSessions', phone)).catch(() => {});

  return { uid, phoneNumber: phone };
};

export const logout = async () => {
  _otp = _phone = _expiry = null;
  await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]);
  try { signOut(getFirebaseAuth()); } catch {}
};

export const getStoredUser = async () => {
  try {
    const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);
    return uid ? { uid, phoneNumber: phone } : null;
  } catch { return null; }
};
