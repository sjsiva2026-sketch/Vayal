// context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUser }  from '../firebase/firestore';

const KEY_UID   = '@vayal_uid';
const KEY_PHONE = '@vayal_phone';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [[, uid], [, phone]] = await AsyncStorage.multiGet([KEY_UID, KEY_PHONE]);
        if (uid && alive) {
          setUser({ uid, phoneNumber: phone });
          try {
            const profile = await Promise.race([
              getUser(uid),
              new Promise((_, r) => setTimeout(() => r(null), 5000)),
            ]);
            if (alive && profile) setUserProfile(profile);
          } catch { /* offline — show RoleSelect */ }
        }
      } catch (e) {
        console.warn('[Auth] bootstrap failed:', e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, userProfile, setUserProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
