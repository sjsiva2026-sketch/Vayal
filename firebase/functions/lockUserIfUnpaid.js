// firebase/functions/lockUserIfUnpaid.js
import { getUnpaidPayments, updateUser } from '../firestore';

export const lockOwnerIfUnpaid = async (ownerId) => {
  try {
    const snap = await getUnpaidPayments(ownerId);
    if (!snap.empty) {
      await updateUser(ownerId, { isLocked: true });
      return true;
    }
    return false;
  } catch (e) {
    console.warn('lockOwnerIfUnpaid:', e.message);
    return false;
  }
};

export const unlockOwner = async (ownerId) => {
  try {
    await updateUser(ownerId, { isLocked: false });
  } catch (e) {
    console.warn('unlockOwner:', e.message);
  }
};
