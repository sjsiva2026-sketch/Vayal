// context/UserContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);

  const updateProfile = useCallback((updates) => {
    setUserProfile(prev => prev ? { ...prev, ...updates } : updates);
  }, []);

  const clearProfile = useCallback(() => setUserProfile(null), []);

  return (
    <UserContext.Provider value={{ userProfile, setUserProfile, updateProfile, clearProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
