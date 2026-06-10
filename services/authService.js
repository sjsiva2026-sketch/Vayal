// services/authService.js
// Thin wrapper around firebase/auth.js for use by screens/contexts

import { sendOTP, verifyOTP, logout, onAuthChange, clearOTPSession } from '../firebase/auth';
import { createUser, getUser, updateUser }                           from '../firebase/firestore';

export const authService = {

  // Send real OTP via Firebase Phone Auth (Play Integrity / SafetyNet on Android)
  // No reCAPTCHA verifier needed — handled natively by Firebase in production builds
  sendOTP: async (phone) => {
    return await sendOTP(`+91${phone}`);
  },

  // Verify OTP code entered by user — Firebase SMS confirmation
  verifyOTP: async (otp) => {
    return await verifyOTP(otp);
  },

  // Clear OTP session (e.g. user navigates back from OTP screen)
  clearOTPSession,

  // Register a brand new user after OTP verify
  register: async (uid, { role, phone, name, state, district, taluk, village }) => {
    const profile = {
      role,
      phone,
      name:      name    || '',
      state:     state   || 'Tamil Nadu',
      district:  district || '',
      taluk:     taluk   || '',
      village:   village || '',
      verified:  false,
      isLocked:  false,
      createdAt: new Date().toISOString(),
    };
    await createUser(uid, profile);
    return profile;
  },

  // Fetch existing user profile
  getProfile: async (uid) => await getUser(uid),

  // Update profile fields
  updateProfile: async (uid, data) => await updateUser(uid, data),

  // Logout — clears Firebase Auth session + AsyncStorage
  logout,

  // Listen to Firebase Auth state changes (used in AuthContext)
  onAuthChange,
};
