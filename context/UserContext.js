import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);

  const updateProfile = (data) =>
    setUserProfile((prev) => ({ ...prev, ...data }));

  const clearProfile = () => setUserProfile(null);

  return (
    <UserContext.Provider value={{ userProfile, setUserProfile, updateProfile, clearProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
