import {
  getBookingsByOwner,
  updateBooking,
  listenBookingsByOwner,
  getUser,
  upsertDailyPayment,
  getDailyPayment,
} from '../../../firebase/firestore';
import { unlockOwner }         from '../../../firebase/functions/lockUserIfUnpaid';
import { calculateCommission } from '../../../utils/calculateCommission';
import { todayString }         from '../../../utils/dateFormatter';

export const ownerService = {

  // Get bookings enriched with farmerPhone (for PhoneConnect)
  getBookingsEnriched: async (ownerId) => {
    const snap     = await getBookingsByOwner(ownerId);
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const enriched = await Promise.all(
      bookings.map(async (b) => {
        if (!b.farmerPhone && b.farmerId) {
          const farmer = await getUser(b.farmerId);
          return { ...b, farmerPhone: farmer?.phone || '', farmerName: farmer?.name || b.farmerName };
        }
        return b;
      })
    );
    return enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },

  // Accept a booking
  acceptBooking: (bookingId) =>
    updateBooking(bookingId, { status: 'accepted' }),

  // Reject a booking
  rejectBooking: (bookingId) =>
    updateBooking(bookingId, { status: 'rejected' }),

  // Verify OTP → mark as ongoing
  startWork: async (bookingId, inputOTP, storedOTP) => {
    if (inputOTP.trim() !== storedOTP.trim()) {
      throw new Error('OTP does not match. Please ask the farmer for the correct code.');
    }
    await updateBooking(bookingId, { status: 'ongoing' });
  },

  // Complete work → update booking + daily payment
  completeWork: async (ownerId, ownerName, ownerPhone, bookingId, hectareCompleted) => {
    const hc         = parseFloat(hectareCompleted);
    const commission = calculateCommission(hc);

    // 1. Update booking to completed
    await updateBooking(bookingId, {
      status:           'completed',
      hectareCompleted: hc,
      commission,
    });

    // 2. Add to daily payment record
    const today    = todayString();
    const existing = await getDailyPayment(ownerId, today);
    await upsertDailyPayment(ownerId, today, {
      ownerName,
      ownerPhone,
      totalHectare:    (existing?.totalHectare    || 0) + hc,
      totalCommission: (existing?.totalCommission || 0) + commission,
      status:          'unpaid',
    });

    return commission;
  },

  // Mark commission paid + unlock account
  markCommissionPaid: async (ownerId) => {
    await upsertDailyPayment(ownerId, todayString(), { status: 'paid' });
    await unlockOwner(ownerId);
  },

  // Real-time bookings listener
  listenBookings: listenBookingsByOwner,
};
