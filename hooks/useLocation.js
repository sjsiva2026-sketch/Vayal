import { useState } from 'react';
import { updateUser } from '../firebase/firestore';
import { useUser }    from '../context/UserContext';
import { useAuth }    from '../context/AuthContext';

export const useLocation = () => {
  const { user }               = useAuth();
  const { userProfile, updateProfile } = useUser();
  const [saving, setSaving]    = useState(false);

  const saveLocation = async ({ district, taluk, village }) => {
    setSaving(true);
    await updateUser(user.uid, { district, taluk, village });
    updateProfile({ district, taluk, village });
    setSaving(false);
  };

  return {
    location: {
      district: userProfile?.district || '',
      taluk:    userProfile?.taluk    || '',
      village:  userProfile?.village  || '',
    },
    saving,
    saveLocation,
  };
};
