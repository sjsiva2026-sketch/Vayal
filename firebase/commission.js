// firebase/commission.js
// COMMISSION RULE: Rs.20 per hectare ONLY
// LOCK RULE:       timePassed >= 24h AND paymentStatus != 'paid' → isLocked = true
// HIDE RULE:       timePassed < 24h  → PayCommission tab COMPLETELY HIDDEN

import {
  doc, getDoc, updateDoc, setDoc, onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

export const COMMISSION_RATE = 20;
export const LOCK_WINDOW_MS  = 24 * 60 * 60 * 1000;

// ── Pure time util ─────────────────────────────────────────────────────────
export function computeLockState(userDoc) {
  const empty = { shouldLock: false, msRemaining: null, timePassed: null, isWithin24h: false };
  if (!userDoc) return empty;
  const { otpVerifiedAt, paymentStatus } = userDoc;
  if (paymentStatus === 'paid') return empty;
  if (!otpVerifiedAt)           return empty;
  const verifiedMs  = new Date(otpVerifiedAt).getTime();
  if (isNaN(verifiedMs))        return empty;
  const timePassed  = Date.now() - verifiedMs;
  const msRemaining = LOCK_WINDOW_MS - timePassed;
  const shouldLock  = timePassed >= LOCK_WINDOW_MS;
  return {
    shouldLock,
    msRemaining:  Math.max(0, msRemaining),
    timePassed,
    isWithin24h:  !shouldLock,
  };
}

// ── 1. Complete job with OTP ────────────────────────────────────────────────
export async function completeJobWithOTP(bookingId, hectare, ownerId) {
  const bookingRef = doc(db, 'bookings', bookingId);
  const ownerRef   = doc(db, 'users', ownerId);

  return runTransaction(db, async (txn) => {
    const [bookingSnap, ownerSnap] = await Promise.all([
      txn.get(bookingRef), txn.get(ownerRef),
    ]);
    if (!bookingSnap.exists()) throw new Error('Booking not found');
    const bData = bookingSnap.data();
    if (bData.status === 'completed' || bData.isCommissionAdded) {
      return { alreadyCompleted: true };
    }
    const thisCommission   = Math.round(hectare * COMMISSION_RATE);
    const oData            = ownerSnap.exists() ? ownerSnap.data() : {};
    const existingAmt      = oData.commissionAmount || 0;
    const newTotal         = existingAmt + thisCommission;
    const now              = new Date().toISOString();
    const today            = now.slice(0, 10);
    const isFirst          = !oData.otpVerifiedAt || oData.paymentStatus === 'paid';
    const otpVerifiedAt    = isFirst ? now : oData.otpVerifiedAt;
    const paymentDeadline  = isFirst
      ? new Date(Date.now() + LOCK_WINDOW_MS).toISOString()
      : oData.paymentDeadline;

    txn.update(bookingRef, {
      status: 'completed', otpVerifiedAt: now,
      hectareCompleted: hectare, commissionAmount: thisCommission,
      commission: thisCommission, paymentStatus: 'pending',
      isCommissionAdded: true, isLocked: false, paymentDeadline,
    });
    txn.update(ownerRef, {
      otpVerifiedAt, paymentDeadline,
      commissionAmount: newTotal, commissionDate: today,
      paymentStatus: 'pending', isLocked: false,
    });
    return {
      alreadyCompleted: false, thisCommission,
      commissionAmount: newTotal, otpVerifiedAt, paymentDeadline,
    };
  });
}

// ── 2. Time-lock check ─────────────────────────────────────────────────────
export async function checkTimeLock(ownerId) {
  const noLock = { isLocked: false, shouldShowPayButton: false, msRemaining: null };
  if (!ownerId) return noLock;
  try {
    const snap = await getDoc(doc(db, 'users', ownerId));
    if (!snap.exists()) return noLock;
    const data = snap.data();
    if (data.paymentStatus === 'paid') return noLock;
    const { shouldLock, msRemaining, isWithin24h } = computeLockState(data);
    if (shouldLock && !data.isLocked) {
      await updateDoc(doc(db, 'users', ownerId), { isLocked: true });
    }
    const locked = shouldLock || data.isLocked === true;
    return {
      isLocked: locked, shouldShowPayButton: locked,
      hidePayButton: isWithin24h, msRemaining,
      paymentStatus: data.paymentStatus,
      commissionAmount: data.commissionAmount || 0,
      otpVerifiedAt: data.otpVerifiedAt || null,
    };
  } catch (e) { console.warn('checkTimeLock:', e.message); return noLock; }
}

// ── 3. Realtime listener ───────────────────────────────────────────────────
export function listenOwnerLockState(ownerId, onChange) {
  if (!ownerId) return () => {};
  return onSnapshot(doc(db, 'users', ownerId), (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    const { shouldLock, msRemaining, isWithin24h } = computeLockState(d);
    const locked = d.paymentStatus === 'paid' ? false : (shouldLock || d.isLocked === true);
    onChange({
      isLocked: locked,
      paymentStatus:    d.paymentStatus   ?? 'none',
      paymentDeadline:  d.paymentDeadline ?? null,
      otpVerifiedAt:    d.otpVerifiedAt   ?? null,
      commissionAmount: d.commissionAmount ?? 0,
      msRemaining, isWithin24h,
    });
  }, (e) => console.warn('listenOwnerLockState:', e.message));
}

// ── 4. Upload screenshot ───────────────────────────────────────────────────
export async function uploadPaymentScreenshot(ownerId, imageUri) {
  const response   = await fetch(imageUri);
  const blob       = await response.blob();
  const ext        = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const storageRef = ref(storage, `payments/${ownerId}/screenshot_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

// ── 5. Submit proof (no transactionId) ────────────────────────────────────
export async function submitPaymentProof({ ownerId, screenshotUrl, amount, date }) {
  await setDoc(doc(db, 'commissionPayments', `${ownerId}_${date}`), {
    ownerId, paymentProofUrl: screenshotUrl,
    amount, date, paymentStatus: 'pending_verification',
    submittedAt: serverTimestamp(), adminVerified: false,
  }, { merge: true });
  await updateDoc(doc(db, 'users', ownerId), {
    paymentStatus: 'pending_verification',
    paymentProofUrl: screenshotUrl,
  });
}

// ── 6. Admin verify ────────────────────────────────────────────────────────
export async function adminVerifyPayment(ownerId, docId) {
  await updateDoc(doc(db, 'commissionPayments', docId), {
    paymentStatus: 'paid', adminVerified: true, verifiedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', ownerId), {
    isLocked: false, paymentStatus: 'paid',
    otpVerifiedAt: null, paymentDeadline: null,
    commissionAmount: 0, paymentProofUrl: null,
  });
}

// ── 7. Admin reject ────────────────────────────────────────────────────────
export async function adminRejectPayment(ownerId, docId) {
  await updateDoc(doc(db, 'commissionPayments', docId), {
    paymentStatus: 'rejected', adminVerified: false, rejectedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', ownerId), {
    paymentStatus: 'rejected', isLocked: true,
  });
}
