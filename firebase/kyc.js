// firebase/kyc.js
// KYC Upload + Firestore logic
// Owner CAN: upload images, set kycStatus='pending'
// Owner CANNOT: set kycStatus='verified', isVerified=true, accessGranted=true
// Only ADMIN can set those fields

import { doc, updateDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

// ── Upload one image to /kyc/{ownerId}/{slot}.jpg ──────────────────────────
async function uploadKycImage(ownerId, imageUri, slot) {
  const res  = await fetch(imageUri);
  const blob = await res.blob();
  const ext  = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const path = `kyc/${ownerId}/${slot}.${ext}`;
  const sRef = ref(storage, path);
  await uploadBytes(sRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(sRef);
}

// ── Submit KYC — owner calls this ─────────────────────────────────────────
// Sets kycStatus='pending', accessGranted=false, isVerified=false
export async function submitKyc({ ownerId, name, vehicleNumber, profileUri, licenseUri, aadharUri }) {
  // Upload all 3 images in parallel
  const [profilePhotoUrl, licenseUrl, aadharUrl] = await Promise.all([
    uploadKycImage(ownerId, profileUri,  'profile'),
    uploadKycImage(ownerId, licenseUri,  'license'),
    uploadKycImage(ownerId, aadharUri,   'aadhar'),
  ]);

  await setDoc(doc(db, 'users', ownerId), {
    name,
    vehicleNumber:   vehicleNumber.trim().toUpperCase(),
    profilePhotoUrl,
    licenseUrl,
    aadharUrl,
    kycStatus:       'pending',   // admin will change this
    isVerified:      false,       // only admin sets true
    accessGranted:   false,       // only admin sets true
    kycSubmittedAt:  serverTimestamp(),
  }, { merge: true });
}

// ── Real-time listener — fires when admin changes accessGranted ────────────
export function listenKycStatus(ownerId, onChange) {
  if (!ownerId) return () => {};
  return onSnapshot(
    doc(db, 'users', ownerId),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onChange({
        kycStatus:     d.kycStatus     ?? 'not_submitted',
        isVerified:    d.isVerified    ?? false,
        accessGranted: d.accessGranted ?? false,
      });
    },
    (e) => console.warn('listenKycStatus:', e.message),
  );
}

// ── ADMIN: Approve ─────────────────────────────────────────────────────────
export async function adminApproveKyc(ownerId) {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:     'verified',
    isVerified:    true,
    accessGranted: true,      // unlocks the app
    kycVerifiedAt: serverTimestamp(),
  });
}

// ── ADMIN: Reject ──────────────────────────────────────────────────────────
export async function adminRejectKyc(ownerId, reason = '') {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:     'rejected',
    isVerified:    false,
    accessGranted: false,     // keeps app locked
    kycRejectedAt: serverTimestamp(),
    kycRejectReason: reason,
  });
}
