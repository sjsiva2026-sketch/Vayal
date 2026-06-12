// firebase/auth.js
// Production Firebase Phone Authentication — Real OTP via SMS
//
// ── Why no reCAPTCHA / expo-firebase-recaptcha ────────────────────────────
// expo-firebase-recaptcha is DEPRECATED (last published 3 years ago, broken
// since Expo SDK 48). It must NOT be in package.json or imported anywhere.
//
// Firebase Phone Auth on Android uses Google Play Integrity API (formerly
// SafetyNet) automatically inside a properly signed EAS APK/AAB.
// No reCAPTCHA modal, no WebView, no extra package needed.
//
// One-time Firebase Console setup required:
//   1. Authentication → Sign-in method → Phone → Enable
//   2. Project Settings → Your Android app → Add SHA-1 fingerprint
//      (run: eas credentials  → copy SHA-1)
//
// ── Why this file was crashing ────────────────────────────────────────────
// "Cannot read property 'verify' of undefined"
//
// Root cause: firebase/functions/sendOTP.js had a fake OTP system:
//   export const verifyOTP = (inputOTP, storedOTP) =>
//     inputOTP.trim() === storedOTP.trim()
//
// Some code path was calling verifyOTP(otp, undefined) — storedOTP was
// undefined, and .trim() on undefined threw the error.
// That file has been neutered (see firebase/functions/sendOTP.js).
//
// Secondary cause: lazy auth init (getFirebaseAuth inside a getter that ran
// before AsyncStorage was ready) returned undefined _auth on first call.
// Fixed in firebase/config.js — auth is now initialized eagerly at module load.

import {
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import AsyncStorage        from '@react-native-async-storage/async-storage';
import { auth }            from './config';   // eager-initialized auth instance

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

// Holds Firebase ConfirmationResult between sendOTP() and verifyOTP()
let _confirmationResult = null;

// ── Send OTP ──────────────────────────────────────────────────────────────
// phoneNumber: E.164 format e.g. "+919876543210"
// No recaptchaVerifier needed — Play Integrity handles it silently
export const sendOTP = async (phoneNumber) => {
  // Guard: auth must be initialized
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please restart the app.');
  }

  const e164 = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  try {
    _confirmationResult = await signInWithPhoneNumber(auth, e164);
    return { success: true };
  } catch (e) {
    _confirmationResult = null;
    const code = e?.code || '';
    if (code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number. Please check and try again.');
    } else if (code === 'auth/too-many-requests') {
      throw new Error('Too many OTP requests. Please wait a few minutes and try again.');
    } else if (code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    } else if (code === 'auth/network-request-failed') {
      throw new Error('Network error. Check your internet connection and try again.');
    } else if (code === 'auth/missing-phone-number') {
      throw new Error('Phone number is required.');
    } else if (code === 'auth/captcha-check-failed' || code === 'auth/app-not-authorized') {
      throw new Error(
        'App not authorized for Phone Auth. ' +
        'Add your SHA-1 fingerprint in Firebase Console → Project Settings → Your Android App.'
      );
    } else if (code === 'auth/internal-error') {
      throw new Error('Firebase internal error. Check SHA-1 fingerprint is added in Firebase Console.');
    } else {
      throw new Error(e.message || 'Failed to send OTP. Please try again.');
    }
  }
};

// ── Verify OTP ────────────────────────────────────────────────────────────
export const verifyOTP = async (inputOTP) => {
  if (!_confirmationResult) {
    throw new Error('No OTP session found. Please go back and request a new OTP.');
  }

  const trimmed = (inputOTP || '').trim();
  if (trimmed.length !== 6) {
    throw new Error('Please enter the complete 6-digit OTP.');
  }

  try {
    const result       = await _confirmationResult.confirm(trimmed);
    const firebaseUser = result.user;
    _confirmationResult = null;

    const uid   = firebaseUser.uid;
    const phone = firebaseUser.phoneNumber;

    // Persist UID/phone for backwards-compat AsyncStorage fallback
    await AsyncStorage.multiSet([
      [KEY_UID,   uid],
      [KEY_PHONE, phone || ''],
    ]).catch(() => {});

    return { uid, phoneNumber: phone };
  } catch (e) {
    const code = e?.code || '';
    if (
      code === 'auth/invalid-verification-code' ||
      code === 'auth/invalid-verification-id'
    ) {
      throw new Error('Invalid OTP. Please check the code and try again.');
    } else if (
      code === 'auth/code-expired' ||
      code === 'auth/session-expired'
    ) {
      _confirmationResult = null;
      throw new Error('OTP has expired. Please go back and request a new OTP.');
    } else if (code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please wait a few minutes and try again.');
    } else if (code === 'auth/network-request-failed') {
      throw new Error('Network error. Check your internet connection and try again.');
    } else {
      throw new Error(e.message || 'OTP verification failed. Please try again.');
    }
  }
};

// ── Clear OTP session (on back navigation from OTP screen) ────────────────
export const clearOTPSession = () => {
  _confirmationResult = null;
};

// ── Check if an OTP session is currently active ───────────────────────────
export const hasActiveOTPSession = () => _confirmationResult !== null;

// ── Logout ────────────────────────────────────────────────────────────────
export const logout = async () => {
  _confirmationResult = null;
  try { await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]); } catch {}
  try { await signOut(auth); } catch {}
};

// ── Listen to Firebase Auth state changes ────────────────────────────────
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
