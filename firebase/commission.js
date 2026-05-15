// firebase/commission.js
// FIXED: Timestamp conversion bug — otpVerifiedAt Firestore Timestamp OR ISO string
// FIXED: checkCommissionLock() directly updates Firestore
// FIXED: 30-second polling added in listenOwnerLockState
// TEST: 5 minutes lock window

import {
  doc, getDoc, updateDoc, setDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

export const COMMISSION_RATE = 20;
export const LOCK_WINDOW_MS  = 24 * 60 * 60 * 1000; // 24 hours (production)

// ── Convert ANY timestamp format to milliseconds ───────────────────────────
// Handles: Firestore Timestamp, ISO string, Date object, number
function toMs(value) {
  if (!value) return null;
  // Firestore Timestamp object
  if (value?.toDate) return value.toDate().getTime();
  // Already a number
  if (typeof value === 'number') return value;
  // ISO string or Date
  const ms = new Date(value).getTime();
  return isNaN(ms) ? null : ms;
}

// ── Central lock state calculator ─────────────────────────────────────────
export function computeLockState(userDoc) {
  const empty = { shouldLock: false, msRemaining: null, timePassed: null, isWithin24h: false };
  if (!userDoc) return empty;

  const { otpVerifiedAt, paymentStatus } = userDoc;
  if (paymentStatus === 'paid') return empty;
  if (!otpVerifiedAt)           return empty;

  // ── CRITICAL FIX: convert Firestore Timestamp correctly ──────────────────
  const verifiedMs = toMs(otpVerifiedAt);
  if (!verifiedMs) return empty;

  const currentTime = Date.now();
  const expiryTime  = verifiedMs + LOCK_WINDOW_MS;
  const timePassed  = currentTime - verifiedMs;
  const msRemaining = expiryTime - currentTime;
  const shouldLock  = currentTime > expiryTime;

  // Lock check

  return {
    shouldLock,
    msRemaining:  Math.max(0, msRemaining),
    timePassed,
    isWithin24h:  !shouldLock,
    expiryTime,
  };
}

// ── CENTRAL LOCK CHECK — reads Firestore + updates isLocked directly ───────
export async function checkCommissionLock(ownerId) {
  const noLock = { isLocked: false, msRemaining: null, paymentStatus: null };
  if (!ownerId) return noLock;
  try {
    const snap = await getDoc(doc(db, 'users', ownerId));
    if (!snap.exists()) return noLock;
    const data = snap.data();

    if (data.paymentStatus === 'paid') return noLock;
    if (!data.otpVerifiedAt)           return noLock;

    const { shouldLock, msRemaining, isWithin24h, expiryTime } = computeLockState(data);

    // ── DIRECTLY UPDATE FIRESTORE if expired ─────────────────────────────
    if (shouldLock && data.isLocked !== true) {
      console.log('[Commission] Timer expired! Locking account in Firestore...');
      await updateDoc(doc(db, 'users', ownerId), { isLocked: true });
    }

    const isLocked = shouldLock || data.isLocked === true;
    return {
      isLocked,
      msRemaining:     Math.max(0, msRemaining || 0),
      isWithin24h:     isWithin24h,
      paymentStatus:   data.paymentStatus,
      commissionAmount:data.commissionAmount || 0,
      otpVerifiedAt:   data.otpVerifiedAt,
      expiryTime,
    };
  } catch (e) {
    console.warn('[Commission] checkCommissionLock error:', e.message);
    return noLock;
  }
}

// Alias for backward compatibility
export const checkTimeLock = checkCommissionLock;

// ── Realtime listener + 30-second polling ─────────────────────────────────
export function listenOwnerLockState(ownerId, onChange) {
  if (!ownerId) return () => {};

  let intervalId = null;

  // Poll every 30 seconds — catches cases where onSnapshot misses time-based lock
  const poll = async () => {
    const result = await checkCommissionLock(ownerId).catch(() => null);
    if (result) onChange(result);
  };
  intervalId = setInterval(poll, 30 * 1000);

  // Realtime Firestore listener
  const unsub = onSnapshot(
    doc(db, 'users', ownerId),
    async (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();

      // Re-run lock check to handle timestamp conversion correctly
      const { shouldLock, msRemaining, isWithin24h } = computeLockState(d);

      // Update Firestore if expired but not yet locked
      if (shouldLock && d.isLocked !== true && d.paymentStatus !== 'paid') {
        await updateDoc(doc(db, 'users', ownerId), { isLocked: true }).catch(() => {});
      }

      const isLocked = d.paymentStatus === 'paid' ? false : (shouldLock || d.isLocked === true);

      onChange({
        isLocked,
        paymentStatus:    d.paymentStatus    ?? 'none',
        paymentDeadline:  d.paymentDeadline  ?? null,
        otpVerifiedAt:    d.otpVerifiedAt    ?? null,
        commissionAmount: d.commissionAmount ?? 0,
        msRemaining,
        isWithin24h,
      });
    },
    (e) => console.warn('[Commission] onSnapshot error:', e.message),
  );

  return () => {
    unsub();
    if (intervalId) clearInterval(intervalId);
  };
}

// ── Complete job with OTP ──────────────────────────────────────────────────
export async function completeJobWithOTP(bookingId, hectare, ownerId) {
  const bookingRef = doc(db, 'bookings', bookingId);
  const ownerRef   = doc(db, 'users',    ownerId);

  return runTransaction(db, async (txn) => {
    const [bookingSnap, ownerSnap] = await Promise.all([
      txn.get(bookingRef), txn.get(ownerRef),
    ]);
    if (!bookingSnap.exists()) throw new Error('Booking not found');
    const bData = bookingSnap.data();
    if (bData.status === 'completed' || bData.isCommissionAdded) {
      return { alreadyCompleted: true };
    }

    const thisCommission = Math.round(hectare * COMMISSION_RATE);
    const oData          = ownerSnap.exists() ? ownerSnap.data() : {};
    const existingAmt    = oData.commissionAmount || 0;
    const newTotal       = existingAmt + thisCommission;
    const now            = new Date().toISOString();
    const today          = now.slice(0, 10);

    // Only set otpVerifiedAt on first completion (or after paid reset)
    const isFirst       = !oData.otpVerifiedAt || oData.paymentStatus === 'paid';
    const otpVerifiedAt = isFirst ? now : oData.otpVerifiedAt;
    const paymentDeadline = isFirst
      ? new Date(Date.now() + LOCK_WINDOW_MS).toISOString()
      : oData.paymentDeadline;

    txn.update(bookingRef, {
      status:            'completed',
      otpVerifiedAt:     now,
      hectareCompleted:  hectare,
      commissionAmount:  thisCommission,
      commission:        thisCommission,
      paymentStatus:     'pending',
      isCommissionAdded: true,
      isLocked:          false,
      paymentDeadline,
    });

    txn.update(ownerRef, {
      otpVerifiedAt,
      paymentDeadline,
      commissionAmount:  newTotal,
      commissionDate:    today,
      paymentStatus:     'pending',
      isLocked:          false,
    });

    return {
      alreadyCompleted: false,
      thisCommission,
      commissionAmount: newTotal,
      otpVerifiedAt,
      paymentDeadline,
    };
  });
}

// ── Upload screenshot ──────────────────────────────────────────────────────
export async function uploadPaymentScreenshot(ownerId, imageUri) {
  const response   = await fetch(imageUri);
  const blob       = await response.blob();
  const ext        = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const storageRef = ref(storage, `payments/${ownerId}/screenshot_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

// ── Submit payment proof ───────────────────────────────────────────────────
export async function submitPaymentProof({ ownerId, screenshotUrl, amount, date }) {
  await setDoc(doc(db, 'commissionPayments', `${ownerId}_${date}`), {
    ownerId,
    paymentProofUrl: screenshotUrl,
    amount,
    date,
    paymentStatus:   'pending_verification',
    submittedAt:     serverTimestamp(),
    adminVerified:   false,
  }, { merge: true });

  await updateDoc(doc(db, 'users', ownerId), {
    paymentStatus:   'pending_verification',
    paymentProofUrl: screenshotUrl,
  });
}

// ── Admin: Verify payment ──────────────────────────────────────────────────
export async function adminVerifyPayment(ownerId, docId) {
  await updateDoc(doc(db, 'commissionPayments', docId), {
    paymentStatus: 'paid', adminVerified: true, verifiedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', ownerId), {
    isLocked:         false,
    paymentStatus:    'paid',
    otpVerifiedAt:    null,
    paymentDeadline:  null,
    commissionAmount: 0,
    paymentProofUrl:  null,
  });
}

// ── Admin: Reject payment ──────────────────────────────────────────────────
export async function adminRejectPayment(ownerId, docId) {
  await updateDoc(doc(db, 'commissionPayments', docId), {
    paymentStatus: 'rejected', adminVerified: false, rejectedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', ownerId), {
    paymentStatus: 'rejected', isLocked: true,
  });
}
