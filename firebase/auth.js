// firebase/auth.js
// Production Firebase Phone Authentication (Real OTP via SMS)
// Uses Firebase Auth signInWithPhoneNumber — real OTP sent to user's phone

import {
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from './config';

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

// Holds the Firebase confirmation result between sendOTP and verifyOTP
let _confirmationResult = null;

// ── Send OTP via Firebase Phone Auth ─────────────────────────────────────
// phoneNumber must be in E.164 format, e.g. +919876543210
// recaptchaVerifier is a FirebaseRecaptchaVerifierModal ref (from expo-firebase-recaptcha)
export const sendOTP = async (phoneNumber, recaptchaVerifier) => {
  const auth = getFirebaseAuth();

  if (!recaptchaVerifier) {
    throw new Error('reCAPTCHA verifier is required for phone authentication.');
  }

  try {
    _confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
    return { success: true };
  } catch (e) {
    _confirmationResult = null;
    // Normalize Firebase error codes to readable messages
    const code = e?.code || '';
    if (code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number. Please check and try again.');
    } else if (code === 'auth/too-many-requests') {
      throw new Error('Too many OTP requests. Please wait a few minutes and try again.');
    } else if (code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    } else if (code === 'auth/network-request-failed') {
      throw new Error('Network error. Check your internet connection and try again.');
    } else if (code === 'auth/captcha-check-failed') {
      throw new Error('reCAPTCHA verification failed. Please try again.');
    } else {
      throw new Error(e.message || 'Failed to send OTP. Please try again.');
    }
  }
};

// ── Verify OTP entered by user ────────────────────────────────────────────
export const verifyOTP = async (inputOTP) => {
  if (!_confirmationResult) {
    throw new Error('No OTP session found. Please request a new OTP.');
  }

  const trimmed = inputOTP.trim();
  if (!trimmed || trimmed.length !== 6) {
    throw new Error('Please enter the 6-digit OTP.');
  }

  try {
    const result = await _confirmationResult.confirm(trimmed);
    const firebaseUser = result.user;
    _confirmationResult = null;

    const uid   = firebaseUser.uid;
    const phone = firebaseUser.phoneNumber;

    // Persist session in AsyncStorage for app restart recovery
    await AsyncStorage.multiSet([
      [KEY_UID,   uid],
      [KEY_PHONE, phone],
    ]);

    return { uid, phoneNumber: phone };
  } catch (e) {
    const code = e?.code || '';
    if (
      code === 'auth/invalid-verification-code' ||
      code === 'auth/code-expired'
    ) {
      throw new Error('Invalid or expired OTP. Please check the code and try again.');
    } else if (code === 'auth/session-expired') {
      _confirmationResult = null;
      throw new Error('OTP session expired. Please request a new OTP.');
    } else if (code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please wait a few minutes and try again.');
    } else if (code === 'auth/network-request-failed') {
      throw new Error('Network error. Check your internet connection and try again.');
    } else {
      throw new Error(e.message || 'OTP verification failed. Please try again.');
    }
  }
};

// ── Logout ────────────────────────────────────────────────────────────────
export const logout = async () => {
  _confirmationResult = null;
  try {
    await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]);
  } catch {}
  try {
    await signOut(getFirebaseAuth());
  } catch {}
};

// ── Restore session from AsyncStorage (used in AuthContext bootstrap) ─────
export const getStoredUser = async () => {
  try {
    const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);
    return uid ? { uid, phoneNumber: phone } : null;
  } catch {
    return null;
  }
};

// ── Listen to Firebase Auth state changes ────────────────────────────────
export const onAuthChange = (callback) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};
