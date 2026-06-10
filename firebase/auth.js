// firebase/auth.js
// Production Firebase Phone Authentication — Real OTP via SMS
//
// ── How Phone Auth works in EAS production builds ────────────────────────
// Firebase Phone Auth on Android uses Google Play Integrity / SafetyNet
// automatically when running in a properly signed APK/AAB.
// expo-firebase-recaptcha is DEPRECATED since Expo SDK 48 and must NOT be used.
// No reCAPTCHA modal is shown to the user. Firebase handles verification silently.
//
// The only requirement:
//   1. SHA-1 fingerprint of your EAS signing cert added in Firebase Console
//      (Project Settings → Your app → Add fingerprint)
//   2. Firebase Phone Auth enabled (Authentication → Sign-in method → Phone)
// ─────────────────────────────────────────────────────────────────────────

import {
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from './config';

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

// Holds the Firebase ConfirmationResult between sendOTP() and verifyOTP()
let _confirmationResult = null;

// ── Send OTP ──────────────────────────────────────────────────────────────
// phoneNumber must be in E.164 format, e.g. "+919876543210"
// In EAS production builds, Firebase handles SafetyNet/Play Integrity silently.
// No reCAPTCHA verifier argument needed or accepted.
export const sendOTP = async (phoneNumber) => {
  const auth = getFirebaseAuth();

  const e164 = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  try {
    // Pass undefined as verifier — Firebase uses Play Integrity silently on Android
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
        'App not authorized for Phone Auth. Add your SHA-1 fingerprint in Firebase Console → Project Settings.'
      );
    } else {
      throw new Error(e.message || 'Failed to send OTP. Please try again.');
    }
  }
};

// ── Verify OTP ────────────────────────────────────────────────────────────
export const verifyOTP = async (inputOTP) => {
  if (!_confirmationResult) {
    throw new Error('No OTP session found. Please request a new OTP.');
  }

  const trimmed = (inputOTP || '').trim();
  if (trimmed.length !== 6) {
    throw new Error('Please enter the 6-digit OTP.');
  }

  try {
    const result       = await _confirmationResult.confirm(trimmed);
    const firebaseUser = result.user;
    _confirmationResult = null;

    const uid   = firebaseUser.uid;
    const phone = firebaseUser.phoneNumber;

    // Persist for legacy AsyncStorage fallback (AuthContext primary is onAuthStateChanged)
    await AsyncStorage.multiSet([
      [KEY_UID,   uid],
      [KEY_PHONE, phone || ''],
    ]).catch(() => {});

    return { uid, phoneNumber: phone };
  } catch (e) {
    const code = e?.code || '';
    if (code === 'auth/invalid-verification-code' || code === 'auth/invalid-verification-id') {
      throw new Error('Invalid OTP. Please check the code and try again.');
    } else if (code === 'auth/code-expired' || code === 'auth/session-expired') {
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

// ── Clear pending OTP session (e.g. on back navigation) ──────────────────
export const clearOTPSession = () => {
  _confirmationResult = null;
};

// ── Check if an OTP session is active ────────────────────────────────────
export const hasActiveOTPSession = () => _confirmationResult !== null;

// ── Logout ────────────────────────────────────────────────────────────────
export const logout = async () => {
  _confirmationResult = null;
  try { await AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]); } catch {}
  try { await signOut(getFirebaseAuth()); } catch {}
};

// ── Listen to Firebase Auth state changes ────────────────────────────────
export const onAuthChange = (callback) => {
  return onAuthStateChanged(getFirebaseAuth(), callback);
};
