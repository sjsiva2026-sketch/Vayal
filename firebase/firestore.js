// firebase/firestore.js
import {
  collection, doc,
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, increment,
} from 'firebase/firestore';
import { db } from './config';

// ─── USERS ────────────────────────────────────────────────────────────────────
export const createUser = (uid, data) =>
  setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() });

export const getUser = async (uid) => {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const updateUser = (uid, data) =>
  updateDoc(doc(db, 'users', uid), data);

// ─── MACHINES ─────────────────────────────────────────────────────────────────
export const addMachine = (data) =>
  addDoc(collection(db, 'machines'), { ...data, createdAt: serverTimestamp() });

export const getMachine = async (id) => {
  const snap = await getDoc(doc(db, 'machines', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getMachinesByTalukAndCategory = (taluk, category) =>
  getDocs(query(
    collection(db, 'machines'),
    where('taluk',    '==', taluk),
    where('type',     '==', category),
    where('isActive', '==', true),
  ));

export const getMachinesByOwner = (ownerId) =>
  getDocs(query(collection(db, 'machines'), where('ownerId', '==', ownerId)));

export const updateMachine = (id, data) =>
  updateDoc(doc(db, 'machines', id), data);

export const deleteMachine = (id) =>
  deleteDoc(doc(db, 'machines', id));

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
export const createBooking = (data) =>
  addDoc(collection(db, 'bookings'), { ...data, createdAt: serverTimestamp() });

export const getBooking = async (id) => {
  const snap = await getDoc(doc(db, 'bookings', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getBookingsByFarmer = (farmerId) =>
  getDocs(query(collection(db, 'bookings'), where('farmerId', '==', farmerId)));

export const getBookingsByOwner = (ownerId) =>
  getDocs(query(collection(db, 'bookings'), where('ownerId', '==', ownerId)));

export const updateBooking = (id, data) =>
  updateDoc(doc(db, 'bookings', id), data);

export const cancelBooking = (id) =>
  updateDoc(doc(db, 'bookings', id), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
  });

// ─── DAILY HECTARE LIMITS ─────────────────────────────────────────────────────
export const getFarmerDailyHectares = async (farmerId, date) => {
  try {
    const snap = await getDocs(
      query(collection(db, 'bookings'), where('farmerId', '==', farmerId), where('date', '==', date))
    );
    const ACTIVE = new Set(['pending', 'accepted', 'ongoing', 'completed']);
    let total = 0;
    snap.docs.forEach(d => { const b = d.data(); if (ACTIVE.has(b.status)) total += (b.hectareRequested || 0); });
    return total;
  } catch { return 0; }
};

export const getMachineDailyHectares = async (machineId, date) => {
  try {
    const snap = await getDocs(
      query(collection(db, 'bookings'), where('machineId', '==', machineId), where('date', '==', date))
    );
    const ACTIVE = new Set(['accepted', 'ongoing', 'completed']);
    let total = 0;
    snap.docs.forEach(d => { const b = d.data(); if (ACTIVE.has(b.status)) total += (b.hectareRequested || 0); });
    return total;
  } catch { return 0; }
};

// ─── REAL-TIME LISTENERS ──────────────────────────────────────────────────────
export const listenBookingsByOwner = (ownerId, onData, onError) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('ownerId', '==', ownerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => { console.warn('listenBookingsByOwner:', e.message); if (typeof onError === 'function') onError(e); },
  );

export const listenBookingsByFarmer = (farmerId, onData, onError) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('farmerId', '==', farmerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => { console.warn('listenBookingsByFarmer:', e.message); if (typeof onError === 'function') onError(e); },
  );

// ─── DAILY PAYMENTS ───────────────────────────────────────────────────────────
export const getDailyPayment = async (ownerId, date) => {
  try {
    const snap = await getDoc(doc(db, 'dailyPayments', `${ownerId}_${date}`));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const upsertDailyPayment = (ownerId, date, data) =>
  setDoc(
    doc(db, 'dailyPayments', `${ownerId}_${date}`),
    { ownerId, date, ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );

export const getUnpaidPayments = (ownerId) =>
  getDocs(query(
    collection(db, 'dailyPayments'),
    where('ownerId', '==', ownerId),
    where('status',  '==', 'unpaid'),
  ));

// ─── APP CURRENT ACCOUNT ──────────────────────────────────────────────────────
/**
 * Add one commission payment entry to the app's current account ledger.
 * Collection: appAccount  (one doc per payment transaction)
 * Also increments the running balance in appAccount/summary (a single summary doc).
 *
 * @param {object} entry  { ownerId, ownerName, ownerPhone, amount, hectare, date, paymentMethod }
 */
export const addAppAccountEntry = async (entry) => {
  // 1. Add ledger row
  await addDoc(collection(db, 'appAccount'), {
    ...entry,
    type: 'commission',
    createdAt: serverTimestamp(),
  });

  // 2. Upsert running summary (single doc: appAccount_summary/total)
  await setDoc(
    doc(db, 'appAccountSummary', 'total'),
    {
      totalReceived:  increment(entry.amount),
      totalHectare:   increment(entry.hectare || 0),
      totalEntries:   increment(1),
      lastUpdated:    serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * Get the app-level running totals (admin use).
 */
export const getAppAccountSummary = async () => {
  try {
    const snap = await getDoc(doc(db, 'appAccountSummary', 'total'));
    return snap.exists() ? snap.data() : { totalReceived: 0, totalHectare: 0, totalEntries: 0 };
  } catch { return { totalReceived: 0, totalHectare: 0, totalEntries: 0 }; }
};

/**
 * Get paginated / filtered app account ledger entries (admin use).
 */
export const getAppAccountEntries = () =>
  getDocs(collection(db, 'appAccount'));

/**
 * Get commission entries paid by a specific owner (for owner's own history).
 */
export const getAppAccountByOwner = (ownerId) =>
  getDocs(query(
    collection(db, 'appAccount'),
    where('ownerId', '==', ownerId),
  ));

// ─── RATINGS ─────────────────────────────────────────────────────────────────
export const submitRating = async (data) => {
  await setDoc(doc(db, 'ratings', data.bookingId), { ...data, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'bookings', data.bookingId), { rated: true });
};

export const getRating = async (bookingId) => {
  try {
    const snap = await getDoc(doc(db, 'ratings', bookingId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const getRatingsByOwner = (ownerId) =>
  getDocs(query(collection(db, 'ratings'), where('ownerId', '==', ownerId)));

export const listenRatingsByOwner = (ownerId, onData) =>
  onSnapshot(
    query(collection(db, 'ratings'), where('ownerId', '==', ownerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => console.warn('listenRatingsByOwner:', e.message),
  );
