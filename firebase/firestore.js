// firebase/firestore.js
import {
  collection, doc,
  getDoc, getDocs,
  setDoc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot,
  serverTimestamp, increment,
  enableNetwork, disableNetwork,
} from 'firebase/firestore';
import { db } from './config';

export const goOnline  = () => enableNetwork(db).catch(() => {});
export const goOffline = () => disableNetwork(db).catch(() => {});

// 10s timeout — matches Firestore's own internal timeout
const TIMEOUT_MS = 10000;
const withTimeout = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
    ),
  ]);

// ── USERS ─────────────────────────────────────────────────────────────────
export const createUser = (uid, data) =>
  setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() });

export const getUser = async (uid) => {
  if (!uid) return null;
  try {
    const snap = await withTimeout(getDoc(doc(db, 'users', uid)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const updateUser = async (uid, data) => {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (e) {
    if (e.code === 'not-found') {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
    } else { throw e; }
  }
};

// ── MACHINES ──────────────────────────────────────────────────────────────
export const addMachine = (data) =>
  addDoc(collection(db, 'machines'), { ...data, createdAt: serverTimestamp() });

export const getMachine = async (id) => {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'machines', id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const getMachinesByTalukAndCategory = (taluk, category) =>
  withTimeout(getDocs(query(
    collection(db, 'machines'),
    where('taluk',    '==', taluk),
    where('type',     '==', category),
    where('isActive', '==', true),
  ))).catch(() => ({ docs: [] }));

export const getMachinesByOwner = (ownerId) =>
  withTimeout(getDocs(query(
    collection(db, 'machines'),
    where('ownerId', '==', ownerId),
  ))).catch(() => ({ docs: [] }));

export const updateMachine = (id, data) =>
  updateDoc(doc(db, 'machines', id), data);

export const deleteMachine = (id) =>
  deleteDoc(doc(db, 'machines', id));

// ── BOOKINGS ──────────────────────────────────────────────────────────────
export const createBooking = (data) =>
  addDoc(collection(db, 'bookings'), { ...data, createdAt: serverTimestamp() });

export const getBooking = async (id) => {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'bookings', id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const getBookingsByFarmer = (farmerId) =>
  withTimeout(getDocs(query(
    collection(db, 'bookings'),
    where('farmerId', '==', farmerId),
  ))).catch(() => ({ docs: [] }));

export const getBookingsByOwner = (ownerId) =>
  withTimeout(getDocs(query(
    collection(db, 'bookings'),
    where('ownerId', '==', ownerId),
  ))).catch(() => ({ docs: [] }));

export const updateBooking = (id, data) =>
  updateDoc(doc(db, 'bookings', id), data);

export const cancelBooking = (id) =>
  updateDoc(doc(db, 'bookings', id), {
    status: 'cancelled', cancelledAt: serverTimestamp(),
  });

// ── REAL-TIME LISTENERS ───────────────────────────────────────────────────
export const listenBookingsByOwner = (ownerId, onData, onError) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('ownerId', '==', ownerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => { console.warn('listenBookingsByOwner:', e.code); typeof onError === 'function' ? onError(e) : onData([]); },
  );

export const listenBookingsByFarmer = (farmerId, onData, onError) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('farmerId', '==', farmerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => { console.warn('listenBookingsByFarmer:', e.code); typeof onError === 'function' ? onError(e) : onData([]); },
  );

// ── DAILY HECTARES ────────────────────────────────────────────────────────
export const getFarmerDailyHectares = async (farmerId, date) => {
  try {
    const snap = await withTimeout(getDocs(query(
      collection(db, 'bookings'),
      where('farmerId', '==', farmerId),
      where('date', '==', date),
    )));
    const ACTIVE = new Set(['pending', 'accepted', 'ongoing', 'completed']);
    let total = 0;
    snap.docs.forEach(d => { const b = d.data(); if (ACTIVE.has(b.status)) total += (b.hectareRequested || 0); });
    return total;
  } catch { return 0; }
};

export const getMachineDailyHectares = async (machineId, date) => {
  try {
    const snap = await withTimeout(getDocs(query(
      collection(db, 'bookings'),
      where('machineId', '==', machineId),
      where('date', '==', date),
    )));
    const ACTIVE = new Set(['accepted', 'ongoing', 'completed']);
    let total = 0;
    snap.docs.forEach(d => { const b = d.data(); if (ACTIVE.has(b.status)) total += (b.hectareRequested || 0); });
    return total;
  } catch { return 0; }
};

// ── DAILY PAYMENTS ────────────────────────────────────────────────────────
export const getDailyPayment = async (ownerId, date) => {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'dailyPayments', `${ownerId}_${date}`)));
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
  withTimeout(getDocs(query(
    collection(db, 'dailyPayments'),
    where('ownerId', '==', ownerId),
    where('status', '==', 'unpaid'),
  ))).catch(() => ({ docs: [] }));

// ── TRANSACTION VERIFICATION ──────────────────────────────────────────────
export const verifyTransactionId = async (txnId, amount, ownerId) => {
  const normalised = txnId.trim().toUpperCase();
  try {
    const snap = await withTimeout(getDocs(query(collection(db, 'upiTransactions'), where('txnId', '==', normalised))));
    if (!snap.empty) {
      const txn = snap.docs[0].data();
      const amtOk = Math.abs((txn.amount || 0) - amount) <= 1;
      if (txn.usedBy && txn.usedBy !== ownerId) return { verified: false, pendingManual: false };
      if (amtOk) {
        await updateDoc(snap.docs[0].ref, { usedBy: ownerId, usedAt: serverTimestamp(), verified: true });
        return { verified: true, pendingManual: false };
      }
    }
    await setDoc(doc(db, 'pendingVerifications', normalised), { txnId: normalised, ownerId, amount, submittedAt: serverTimestamp(), status: 'pending' }, { merge: true });
    return { verified: false, pendingManual: true };
  } catch { return { verified: false, pendingManual: true }; }
};

export const savePendingVerification = (txnId, ownerId, amount) =>
  setDoc(doc(db, 'pendingVerifications', txnId.toUpperCase()), { txnId: txnId.toUpperCase(), ownerId, amount, submittedAt: serverTimestamp(), status: 'pending' }, { merge: true });

// ── APP ACCOUNT ───────────────────────────────────────────────────────────
export const addAppAccountEntry = async (data) => {
  try {
    await addDoc(collection(db, 'appAccount'), { ...data, type: 'commission', createdAt: serverTimestamp() });
    await setDoc(doc(db, 'appAccountSummary', 'total'), { totalReceived: increment(data.amount || 0), totalHectare: increment(data.hectare || 0), totalEntries: increment(1), lastUpdated: serverTimestamp() }, { merge: true });
  } catch (e) { console.warn('addAppAccountEntry:', e.message); }
};

export const getAppAccountByOwner = (ownerId) =>
  withTimeout(getDocs(query(collection(db, 'appAccount'), where('ownerId', '==', ownerId)))).catch(() => ({ docs: [] }));

export const getAppAccountEntries = () =>
  withTimeout(getDocs(collection(db, 'appAccount'))).catch(() => ({ docs: [] }));

export const getAppAccountSummary = async () => {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'appAccountSummary', 'total')));
    return snap.exists() ? snap.data() : { totalReceived: 0, totalHectare: 0, totalEntries: 0 };
  } catch { return { totalReceived: 0, totalHectare: 0, totalEntries: 0 }; }
};

// ── RATINGS ───────────────────────────────────────────────────────────────
export const submitRating = async (data) => {
  await setDoc(doc(db, 'ratings', data.bookingId), { ...data, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'bookings', data.bookingId), { rated: true });
};

export const getRating = async (bookingId) => {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'ratings', bookingId)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
};

export const getRatingsByOwner = (ownerId) =>
  withTimeout(getDocs(query(collection(db, 'ratings'), where('ownerId', '==', ownerId)))).catch(() => ({ docs: [] }));

export const listenRatingsByOwner = (ownerId, onData) =>
  onSnapshot(
    query(collection(db, 'ratings'), where('ownerId', '==', ownerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => { console.warn('listenRatingsByOwner:', e.code); onData([]); },
  );

// ── MAINTENANCE ───────────────────────────────────────────────────────────
export const listenMaintenanceStatus = (onData) =>
  onSnapshot(
    doc(db, 'appConfig', 'maintenance'),
    (snap) => {
      if (snap.exists()) {
        onData({ isUnderMaintenance: snap.data().isUnderMaintenance === true, message: snap.data().message || null });
      } else {
        onData({ isUnderMaintenance: false, message: null });
      }
    },
    (e) => { console.warn('listenMaintenanceStatus:', e.code); onData({ isUnderMaintenance: false, message: null }); },
  );
