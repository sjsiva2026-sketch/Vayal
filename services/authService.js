import { sendOTP, verifyOTP, logout, onAuthChange } from '../firebase/auth';
import { createUser, getUser, updateUser }          from '../firebase/firestore';

export const authService = {

  // Send real OTP via Firebase Phone Auth
  // recaptchaVerifier: ref from FirebaseRecaptchaVerifierModal in LoginScreen
  sendOTP: async (phone, recaptchaVerifier) => {
    return await sendOTP(`+91${phone}`, recaptchaVerifier);
  },

  // Verify OTP code entered by user — Firebase confirms against real SMS
  verifyOTP: async (otp) => {
    return await verifyOTP(otp);
  },

  // Register a brand new user after OTP verify
  register: async (uid, { role, phone, name, state, district, taluk, village }) => {
    const profile = {
      role, phone, name,
      state:    state    || 'Tamil Nadu',
      district: district || '',
      taluk:    taluk    || '',
      village:  village  || '',
      verified:  false,
      isLocked:  false,
    };
    await createUser(uid, profile);
    return profile;
  },

  // Fetch existing user profile
  getProfile: async (uid) => await getUser(uid),

  // Update profile fields
  updateProfile: async (uid, data) => await updateUser(uid, data),

  // Logout current user — clears Firebase Auth session + AsyncStorage
  logout,

  // Listen to Firebase Auth state changes (used in AuthContext)
  onAuthChange,
};
