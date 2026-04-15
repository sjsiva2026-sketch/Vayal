import {
  getMachinesByTalukAndCategory,
  createBooking,
  getBookingsByFarmer,
  getUser,
} from '../../../firebase/firestore';
import { generateOTP } from '../../../utils/generateOTP';

export const farmerService = {

  // Search machines in a taluk + category
  // Returns machines with ownerPhone guaranteed (fetches from user doc if missing)
  searchMachines: async (taluk, category) => {
    const snap     = await getMachinesByTalukAndCategory(taluk, category);
    const machines = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const enriched = await Promise.all(
      machines.map(async (m) => {
        if (!m.ownerPhone && m.ownerId) {
          const owner = await getUser(m.ownerId);
          return {
            ...m,
            ownerPhone: owner?.phone || '',
            ownerName:  owner?.name  || m.ownerName || '',
          };
        }
        return m;
      })
    );
    return enriched;
  },

  // Book a machine — stores both farmer + owner phone numbers
  bookMachine: async ({ farmerId, farmerName, farmerPhone, machine, date, timeSlot, hectareRequested }) => {
    const otp = generateOTP();

    // Always fetch latest owner info to ensure phone is fresh
    let ownerPhone = machine.ownerPhone || '';
    let ownerName  = machine.ownerName  || '';
    if (machine.ownerId) {
      const ownerInfo = await getUser(machine.ownerId);
      ownerPhone = ownerInfo?.phone || ownerPhone;
      ownerName  = ownerInfo?.name  || ownerName;
    }

    return await createBooking({
      farmerId,
      farmerName,
      farmerPhone,
      ownerId:          machine.ownerId,
      ownerName,
      ownerPhone,
      machineId:        machine.id,
      machineType:      machine.type,
      pricePerHour:     machine.price_per_hour,
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

  // Get all bookings for a farmer
  getMyBookings: async (farmerId) => {
    const snap = await getBookingsByFarmer(farmerId);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },
};
