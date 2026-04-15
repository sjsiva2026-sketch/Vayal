import { CONFIG } from '../constants/config';
import { updateUser } from '../firebase/firestore';

export const locationService = {

  // Get all Tamil Nadu districts
  getDistricts: () => CONFIG.TAMIL_NADU_DISTRICTS,

  // Filter machines by taluk (case-insensitive)
  filterByTaluk: (machines, taluk) =>
    machines.filter(m =>
      m.taluk?.toLowerCase().trim() === taluk?.toLowerCase().trim()
    ),

  // Save location to Firestore and update local profile
  saveLocation: async (uid, { district, taluk, village }, updateProfile) => {
    await updateUser(uid, { district, taluk, village });
    if (updateProfile) updateProfile({ district, taluk, village });
  },
};
