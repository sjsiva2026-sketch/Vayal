import {
  createBooking,
  updateBooking,
  getBookingsByFarmer,
  getBookingsByOwner,
  listenBookingsByOwner,
  listenBookingsByFarmer,
  getUser,
} from '../firebase/firestore';
import { generateOTP }         from '../utils/generateOTP';
import { calculateCommission } from '../utils/calculateCommission';

export const bookingService = {

  // Farmer creates booking — stores OTP + both phone numbers
  createBooking: async ({ farmerId, farmerProfile, machine, date, timeSlot, hectareRequested }) => {
    const otp       = generateOTP();
    const ownerInfo = await getUser(machine.ownerId);
    return await createBooking({
      farmerId,
      farmerName:       farmerProfile.name  || '',
      farmerPhone:      farmerProfile.phone || '',
      ownerId:          machine.ownerId,
      ownerName:        ownerInfo?.name  || machine.ownerName  || '',
      ownerPhone:       ownerInfo?.phone || machine.ownerPhone || '',
      machineId:        machine.id,
      machineType:      machine.type,
      date,
      timeSlot,
      hectareRequested: parseFloat(hectareRequested),
      hectareCompleted: 0,
      commission:       0,
      status:           'pending',
      otp,
      taluk:            machine.taluk,
    });
  },

  acceptBooking:  (bookingId) => updateBooking(bookingId, { status: 'accepted' }),
  rejectBooking:  (bookingId) => updateBooking(bookingId, { status: 'rejected' }),

  startWork: async (bookingId, inputOTP, storedOTP) => {
    if (inputOTP.trim() !== storedOTP.trim()) throw new Error('Invalid OTP');
    await updateBooking(bookingId, { status: 'ongoing' });
  },

  completeWork: async (bookingId, hectareCompleted) => {
    const commission = calculateCommission(parseFloat(hectareCompleted));
    await updateBooking(bookingId, {
      status: 'completed',
      hectareCompleted: parseFloat(hectareCompleted),
      commission,
    });
    return commission;
  },

  getFarmerBookings: async (farmerId) => {
    const snap = await getBookingsByFarmer(farmerId);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  getOwnerBookings: async (ownerId) => {
    const snap = await getBookingsByOwner(ownerId);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  listenOwnerBookings:  listenBookingsByOwner,
  listenFarmerBookings: listenBookingsByFarmer,
};
