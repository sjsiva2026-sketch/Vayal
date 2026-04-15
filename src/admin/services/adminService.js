import {
  getDocs, collection, query, where,
  updateDoc, doc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

export const adminService = {

  // ── USERS ──────────────────────────────────────────
  getAllUsers: async () => {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  getUsersByRole: async (role) => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Verify an owner (admin action)
  verifyOwner: async (uid) => {
    await updateDoc(doc(db, 'users', uid), { verified: true });
  },

  // Lock or unlock any user
  setUserLock: async (uid, isLocked) => {
    await updateDoc(doc(db, 'users', uid), { isLocked });
  },

  // ── MACHINES ───────────────────────────────────────
  getAllMachines: async () => {
    const snap = await getDocs(collection(db, 'machines'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  setMachineActive: async (machineId, isActive) => {
    await updateDoc(doc(db, 'machines', machineId), { isActive });
  },

  deleteMachine: async (machineId) => {
    await deleteDoc(doc(db, 'machines', machineId));
  },

  // ── BOOKINGS ───────────────────────────────────────
  getAllBookings: async () => {
    const snap = await getDocs(collection(db, 'bookings'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  },

  // ── PAYMENTS ───────────────────────────────────────
  getAllPayments: async () => {
    const snap = await getDocs(collection(db, 'dailyPayments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.date > a.date ? 1 : -1);
  },

  getUnpaidPayments: async () => {
    const snap = await getDocs(query(
      collection(db, 'dailyPayments'),
      where('status', '==', 'unpaid'),
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Admin force-marks payment as paid + unlocks owner
  forceMarkPaid: async (paymentDocId, ownerId) => {
    await updateDoc(doc(db, 'dailyPayments', paymentDocId), { status: 'paid' });
    await updateDoc(doc(db, 'users', ownerId), { isLocked: false });
  },

  // ── REVENUE SUMMARY ────────────────────────────────
  getRevenueSummary: async () => {
    const snap    = await getDocs(collection(db, 'dailyPayments'));
    const records = snap.docs.map(d => d.data());
    return {
      totalRevenue:   records.filter(r => r.status === 'paid')
                             .reduce((s, r) => s + (r.totalCommission || 0), 0),
      pendingRevenue: records.filter(r => r.status === 'unpaid')
                             .reduce((s, r) => s + (r.totalCommission || 0), 0),
      totalHectare:   records.reduce((s, r) => s + (r.totalHectare || 0), 0),
    };
  },
};
