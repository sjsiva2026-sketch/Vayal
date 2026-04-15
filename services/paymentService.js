import {
  upsertDailyPayment,
  getDailyPayment,
  getUnpaidPayments,
} from '../firebase/firestore';
import { unlockOwner, lockOwnerIfUnpaid } from '../firebase/functions/lockUserIfUnpaid';
import { todayString }                    from '../utils/dateFormatter';

const COMMISSION_RATE = 30; // ₹30 per hectare

export const paymentService = {

  // Add a completed job's hectare to today's running total
  recordJobPayment: async (ownerId, ownerName, ownerPhone, hectareCompleted) => {
    const today    = todayString();
    const existing = await getDailyPayment(ownerId, today);
    const prevHectare    = existing?.totalHectare    || 0;
    const prevCommission = existing?.totalCommission || 0;

    await upsertDailyPayment(ownerId, today, {
      ownerName,
      ownerPhone,
      totalHectare:    prevHectare    + hectareCompleted,
      totalCommission: prevCommission + (hectareCompleted * COMMISSION_RATE),
      status:          'unpaid',
    });
  },

  // Get today's summary
  getTodaySummary: async (ownerId) =>
    await getDailyPayment(ownerId, todayString()),

  // Mark today's commission as paid + unlock owner account
  markPaid: async (ownerId) => {
    await upsertDailyPayment(ownerId, todayString(), { status: 'paid' });
    await unlockOwner(ownerId);
  },

  // Check unpaid and lock if needed (called at midnight)
  checkAndLock: async (ownerId) =>
    await lockOwnerIfUnpaid(ownerId),

  // Get all unpaid records for an owner
  getUnpaidRecords: async (ownerId) => {
    const snap = await getUnpaidPayments(ownerId);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};
