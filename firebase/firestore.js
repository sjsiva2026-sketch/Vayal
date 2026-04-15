// firebase/firestore.js
import {
  collection, doc,
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

// USERS
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

// MACHINES
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

// BOOKINGS
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

// BUG FIX: Accept an optional onError callback so callers can show error UI
// instead of silently failing. Falls back to console.warn if not provided.
export const listenBookingsByOwner = (ownerId, onData, onError) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('ownerId', '==', ownerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => {
      console.warn('listenBookingsByOwner:', e.message);
      if (typeof onError === 'function') onError(e);
    },
  );

export const listenBookingsByFarmer = (farmerId, onData, onError) =>
  onSnapshot(
    query(collection(db, 'bookings'), where('farmerId', '==', farmerId)),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (e) => {
      console.warn('listenBookingsByFarmer:', e.message);
      if (typeof onError === 'function') onError(e);
    },
  );

// DAILY PAYMENTS
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
