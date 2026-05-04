// context/AuthContext.js
// Handles both phone OTP (farmer/owner) and email/password (admin) sessions

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
    let alive    = true;
    let unsubFB  = null;

    (async () => {
      try {
        // ── Step 1: Check phone-based session (farmer/owner) ────────────────
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

        // ── Step 2: Check Firebase Auth session (admin email/password) ──────
        const auth = getFirebaseAuth();
        unsubFB = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!alive) return;
          if (firebaseUser) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
            const profile = await getUser(firebaseUser.uid).catch(() => null);
            if (alive && profile?.role === 'admin') {
              setUserProfile({ ...profile, id: firebaseUser.uid });
            }
          }
          if (alive) setLoading(false);
        });

      } catch (e) {
        console.warn('[Auth] bootstrap:', e.message);
        if (alive) setLoading(false);
      }
    })();

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
