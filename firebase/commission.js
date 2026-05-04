// firebase/commission.js
// ─────────────────────────────────────────────────────────────────────────────
// STRICT COMMISSION CONTROL SYSTEM
//
// COMMISSION RULE:  Rs.20 per hectare ONLY (matches CONFIG.COMMISSION_PER_HECTARE)
// ACCUMULATION:     Multiple bookings within 24h window ADD UP
// LOCK RULE:        timePassed >= 24h AND paymentStatus != 'paid' → isLocked = true
// HIDE RULE:        timePassed < 24h  → PayCommission screen COMPLETELY HIDDEN
//
// Firestore — users/{ownerId}:
//   otpVerifiedAt:    ISO string  (first job completion in current window)
//   paymentDeadline:  ISO string  (otpVerifiedAt + 24h)
//   commissionAmount: number      (accumulates across bookings)
//   commissionDate:   YYYY-MM-DD  (date of current window)
//   paymentStatus:    'none' | 'pending' | 'pending_verification' | 'paid' | 'rejected'
//   isLocked:         boolean
//   transactionId:    string
//   paymentProofUrl:  string
//
// Firestore — commissionPayments/{ownerId_date}:
//   All proof fields + adminVerified
// ─────────────────────────────────────────────────────────────────────────────

import {
  doc, getDoc, updateDoc, setDoc, onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

// ── Core constants ─────────────────────────────────────────────────────────
export const COMMISSION_RATE = 20;                          // Rs.20 per hectare
export const LOCK_WINDOW_MS  = 24 * 60 * 60 * 1000;        // 24h in ms

// ─────────────────────────────────────────────────────────────────────────────
// PURE TIME UTIL — no Firestore, no side effects
// Input: userDoc from Firestore (or local profile)
// Output: { shouldLock, msRemaining, timePassed, isWithin24h }
// ─────────────────────────────────────────────────────────────────────────────
export function computeLockState(userDoc) {
  const empty = { shouldLock: false, msRemaining: null, timePassed: null, isWithin24h: false };
  if (!userDoc) return empty;

  const { otpVerifiedAt, paymentStatus } = userDoc;

  if (paymentStatus === 'paid')  return empty;   // admin unlocked — never lock
  if (!otpVerifiedAt)            return empty;   // no job done yet

  const verifiedMs  = new Date(otpVerifiedAt).getTime();
  if (isNaN(verifiedMs))         return empty;   // corrupt date

  const timePassed  = Date.now() - verifiedMs;
  const msRemaining = LOCK_WINDOW_MS - timePassed;
  const shouldLock  = timePassed >= LOCK_WINDOW_MS;

  return {
    shouldLock,
    msRemaining:  Math.max(0, msRemaining),
    timePassed,
    isWithin24h:  !shouldLock,  // true = before deadline, PayCommission hidden
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. COMPLETE JOB — Atomic Firestore Transaction
//
// ACCUMULATION LOGIC:
//   • First booking of the day → set otpVerifiedAt, paymentDeadline, commissionAmount
//   • Subsequent bookings same day → ADD to commissionAmount (do NOT overwrite)
//   • Each booking stores its own commissionAmount per booking doc
//
// IDEMPOTENCY: booking already completed → return { alreadyCompleted: true }
// ─────────────────────────────────────────────────────────────────────────────
export async function completeJobWithOTP(bookingId, hectare, ownerId) {
  const bookingRef = doc(db, 'bookings', bookingId);
  const ownerRef   = doc(db, 'users', ownerId);

  return runTransaction(db, async (txn) => {
    const [bookingSnap, ownerSnap] = await Promise.all([
      txn.get(bookingRef),
      txn.get(ownerRef),
    ]);

    if (!bookingSnap.exists()) throw new Error('Booking not found');
    const bData = bookingSnap.data();

    // ── Idempotency guard ────────────────────────────────────────────────
    if (bData.status === 'completed' || bData.isCommissionAdded === true) {
      return { alreadyCompleted: true };
    }

    // ── Per-booking commission (Rs.20 per hectare, fixed) ────────────────
    const thisCommission = Math.round(hectare * COMMISSION_RATE);  // e.g. 2.5ha = Rs.50

    // ── Accumulation: add to existing owner total ─────────────────────────
    const oData               = ownerSnap.exists() ? ownerSnap.data() : {};
    const existingCommission  = oData.commissionAmount || 0;
    const newTotalCommission  = existingCommission + thisCommission;

    const now             = new Date().toISOString();
    const today           = now.slice(0, 10);

    // First booking of this payment window? → set otpVerifiedAt + deadline
    // Subsequent booking? → keep existing otpVerifiedAt (don't reset 24h window)
    const isFirstBooking   = !oData.otpVerifiedAt || oData.paymentStatus === 'paid';
    const otpVerifiedAt    = isFirstBooking ? now : oData.otpVerifiedAt;
    const paymentDeadline  = isFirstBooking
      ? new Date(Date.now() + LOCK_WINDOW_MS).toISOString()
      : oData.paymentDeadline;

    // ── Update booking doc (per-booking commission stored here) ───────────
    txn.update(bookingRef, {
      status:            'completed',
      otpVerifiedAt:     now,               // this booking's completion time
      hectareCompleted:  hectare,
      commissionAmount:  thisCommission,    // THIS booking's commission only
      commission:        thisCommission,
      paymentStatus:     'pending',
      isCommissionAdded: true,
      isLocked:          false,
      paymentDeadline,
    });

    // ── Update owner doc (running total) ──────────────────────────────────
    txn.update(ownerRef, {
      otpVerifiedAt,                        // first booking's time (window start)
      paymentDeadline,
      commissionAmount: newTotalCommission, // ACCUMULATED total
      commissionDate:   today,
      paymentStatus:    'pending',
      isLocked:         false,
    });

    return {
      alreadyCompleted:  false,
      thisCommission,
      totalCommission:   newTotalCommission,
      otpVerifiedAt,
      paymentDeadline,
      isFirstBooking,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TIME-LOCK CHECK — called on app launch + screen focus
//    Reads otpVerifiedAt, computes time passed
//    If ≥ 24h + not paid → writes isLocked=true to Firestore
// ─────────────────────────────────────────────────────────────────────────────
export async function checkTimeLock(ownerId) {
  const noLock = { isLocked: false, shouldShowPayButton: false, msRemaining: null };
  if (!ownerId) return noLock;
  try {
    const snap = await getDoc(doc(db, 'users', ownerId));
    if (!snap.exists()) return noLock;
    const data = snap.data();

    if (data.paymentStatus === 'paid') return noLock;

    const { shouldLock, msRemaining, timePassed, isWithin24h } = computeLockState(data);

    if (shouldLock && !data.isLocked) {
      await updateDoc(doc(db, 'users', ownerId), { isLocked: true });
    }

    const locked = shouldLock || data.isLocked === true;
    return {
      isLocked:            locked,
      shouldShowPayButton: locked,            // PayCommission shown ONLY when locked
      hidePayButton:       isWithin24h,       // completely hidden before 24h
      msRemaining,
      timePassed,
      paymentStatus:       data.paymentStatus,
      commissionAmount:    data.commissionAmount || 0,
      otpVerifiedAt:       data.otpVerifiedAt || null,
    };
  } catch (e) {
    console.warn('checkTimeLock:', e.message);
    return noLock;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REAL-TIME LISTENER
//    Fires on every Firestore change to users/{ownerId}
//    Recomputes lock state from otpVerifiedAt each time
// ─────────────────────────────────────────────────────────────────────────────
export function listenOwnerLockState(ownerId, onChange) {
  if (!ownerId) return () => {};
  return onSnapshot(
    doc(db, 'users', ownerId),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const { shouldLock, msRemaining, timePassed, isWithin24h } = computeLockState(d);
      const locked = d.paymentStatus === 'paid' ? false : (shouldLock || d.isLocked === true);
      onChange({
        isLocked:            locked,
        paymentStatus:       d.paymentStatus   ?? 'none',
        paymentDeadline:     d.paymentDeadline ?? null,
        otpVerifiedAt:       d.otpVerifiedAt   ?? null,
        commissionAmount:    d.commissionAmount ?? 0,
        msRemaining,
        timePassed,
        isWithin24h,                           // true = before 24h, hide PayCommission
        shouldShowPayButton: !isWithin24h && locked,
      });
    },
    (e) => console.warn('listenOwnerLockState:', e.message),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. UPLOAD SCREENSHOT — /payments/{ownerId}/{filename}
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadPaymentScreenshot(ownerId, imageUri) {
  const response   = await fetch(imageUri);
  const blob       = await response.blob();
  const ext        = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const storageRef = ref(storage, `payments/${ownerId}/screenshot_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUBMIT PAYMENT PROOF
//    Owner submits txnId + screenshot URL
//    Sets paymentStatus = 'pending_verification'
//    isLocked stays TRUE — only admin can set it false
// ─────────────────────────────────────────────────────────────────────────────
export async function submitPaymentProof({ ownerId, transactionId, screenshotUrl, amount, date }) {
  await setDoc(doc(db, 'commissionPayments', `${ownerId}_${date}`), {
    ownerId,
    transactionId:   transactionId.trim().toUpperCase(),
    paymentProofUrl: screenshotUrl,
    amount,
    date,
    paymentStatus:   'pending_verification',
    submittedAt:     serverTimestamp(),
    adminVerified:   false,
  }, { merge: true });

  await updateDoc(doc(db, 'users', ownerId), {
    paymentStatus:   'pending_verification',
    transactionId:   transactionId.trim().toUpperCase(),
    paymentProofUrl: screenshotUrl,
    // isLocked stays TRUE — only admin changes this
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN: VERIFY → unlock owner
// ─────────────────────────────────────────────────────────────────────────────
export async function adminVerifyPayment(ownerId, docId) {
  await updateDoc(doc(db, 'commissionPayments', docId), {
    paymentStatus: 'paid',
    adminVerified: true,
    verifiedAt:    serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', ownerId), {
    isLocked:         false,
    paymentStatus:    'paid',
    otpVerifiedAt:    null,   // reset window so next cycle starts fresh
    paymentDeadline:  null,
    commissionAmount: 0,
    transactionId:    null,
    paymentProofUrl:  null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ADMIN: REJECT
// ─────────────────────────────────────────────────────────────────────────────
export async function adminRejectPayment(ownerId, docId) {
  await updateDoc(doc(db, 'commissionPayments', docId), {
    paymentStatus: 'rejected',
    adminVerified: false,
    rejectedAt:    serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', ownerId), {
    paymentStatus: 'rejected',
    isLocked:      true,
  });
}
