import {
  addMachine,
  getMachinesByTalukAndCategory,
  getMachinesByOwner,
  updateMachine,
  deleteMachine,
  getUser,
} from '../firebase/firestore';

export const machineService = {

  // Add machine — always stores ownerPhone so farmers can see it
  addMachine: async ({ ownerId, ownerName, ownerPhone, type, price_per_hour, taluk }) => {
    return await addMachine({
      ownerId,
      ownerName,
      ownerPhone,   // ← critical for farmer to call owner
      type,
      price_per_hour,
      taluk,
      isActive: true,
    });
  },

  // Search machines by taluk + category, enrich with ownerPhone if missing
  getMachines: async (taluk, category) => {
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

  // Get owner's own machines
  getOwnerMachines: async (ownerId) => {
    const snap = await getMachinesByOwner(ownerId);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Toggle active/inactive
  toggleActive: async (machineId, currentStatus) => {
    await updateMachine(machineId, { isActive: !currentStatus });
  },

  // Update price / taluk
  updateMachine: async (machineId, data) => {
    await updateMachine(machineId, data);
  },

  // Delete machine
  deleteMachine: async (machineId) => {
    await deleteMachine(machineId);
  },
};
