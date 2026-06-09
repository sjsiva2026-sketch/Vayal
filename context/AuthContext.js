// context/AuthContext.js
// Handles both phone OTP (farmer/owner) and email/password (admin) sessions
// Auth persistence: Firebase Auth + AsyncStorage — no re-OTP on app restart

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUser }  from '../firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth }    from '../firebase/config';

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    let alive   = true;
    let unsubFB = null;

    const auth = getFirebaseAuth();

    // Primary: listen to Firebase Auth state changes
    // This covers both phone-auth users and admin email/password users
    // Firebase Auth + AsyncStorage persistence means the user stays logged in
    // across app restarts until explicit logout or token expiry
    unsubFB = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!alive) return;

      if (firebaseUser) {
        // Firebase has a valid authenticated session
        const uid   = firebaseUser.uid;
        const phone = firebaseUser.phoneNumber || null;
        const email = firebaseUser.email || null;

        setUser({ uid, phoneNumber: phone, email });

        // Fetch profile from Firestore (with timeout fallback)
        const profile = await Promise.race([
          getUser(uid),
          new Promise(r => setTimeout(() => r(null), 5000)),
        ]).catch(() => null);

        if (alive && profile) {
          setUserProfile({
            ...profile,
            id:               uid,
            otpVerifiedAt:    profile.otpVerifiedAt    ?? null,
            paymentDeadline:  profile.paymentDeadline  ?? null,
            commissionAmount: profile.commissionAmount ?? 0,
            paymentStatus:    profile.paymentStatus    ?? 'none',
            isLocked:         profile.isLocked         ?? false,
            kycStatus:        profile.kycStatus        ?? 'not_submitted',
            accessGranted:    profile.accessGranted    ?? false,
          });
        }

        if (alive) setLoading(false);
        return;
      }

      // No Firebase Auth session — check legacy AsyncStorage session
      // (for backwards compatibility with existing installs before this update)
      try {
        const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);

        if (uid && alive) {
          setUser({ uid, phoneNumber: phone });
          const profile = await Promise.race([
            getUser(uid),
            new Promise(r => setTimeout(() => r(null), 4000)),
          ]).catch(() => null);

          if (alive && profile) {
            setUserProfile({
              ...profile,
              id:               uid,
              otpVerifiedAt:    profile.otpVerifiedAt    ?? null,
              paymentDeadline:  profile.paymentDeadline  ?? null,
              commissionAmount: profile.commissionAmount ?? 0,
              paymentStatus:    profile.paymentStatus    ?? 'none',
              isLocked:         profile.isLocked         ?? false,
              kycStatus:        profile.kycStatus        ?? 'not_submitted',
              accessGranted:    profile.accessGranted    ?? false,
            });
          }

          // Clear legacy storage — Firebase Auth will handle persistence going forward
          AsyncStorage.multiRemove([KEY_UID, KEY_PHONE]).catch(() => {});
        }
      } catch {}

      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
      unsubFB?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, userProfile, setUserProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
