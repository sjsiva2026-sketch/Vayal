// firebase/kyc.js
// UPDATED: License Front+Back, Aadhar Front+Back uploads
// Storage paths: /kyc/{ownerId}/license_front.jpg etc.

import { doc, updateDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

// ── Upload single image to /kyc/{ownerId}/{slot} ──────────────────────────
async function uploadKycImage(ownerId, imageUri, slot) {
  const res  = await fetch(imageUri);
  const blob = await res.blob();
  const sRef = ref(storage, `kyc/${ownerId}/${slot}.jpg`);
  await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(sRef);
}

// ── Submit KYC — all 8 fields mandatory ──────────────────────────────────
export async function submitKyc({
  ownerId,
  name,
  vehicleNumber,
  profileUri,
  licenseFrontUri,
  licenseBackUri,
  aadharFrontUri,
  aadharBackUri,
  vehicleImageUri,
}) {
  // Upload all images in parallel
  const [
    profilePhotoUrl,
    licenseFrontUrl,
    licenseBackUrl,
    aadharFrontUrl,
    aadharBackUrl,
    vehicleImageUrl,
  ] = await Promise.all([
    uploadKycImage(ownerId, profileUri,      'profile'),
    uploadKycImage(ownerId, licenseFrontUri, 'license_front'),
    uploadKycImage(ownerId, licenseBackUri,  'license_back'),
    uploadKycImage(ownerId, aadharFrontUri,  'aadhar_front'),
    uploadKycImage(ownerId, aadharBackUri,   'aadhar_back'),
    uploadKycImage(ownerId, vehicleImageUri, 'vehicle'),
  ]);

  await setDoc(doc(db, 'users', ownerId), {
    name,
    vehicleNumber:   vehicleNumber.trim().toUpperCase(),
    profilePhotoUrl,
    licenseFrontUrl,
    licenseBackUrl,
    aadharFrontUrl,
    aadharBackUrl,
    vehicleImageUrl,
    kycStatus:       'pending',
    isVerified:      false,
    accessGranted:   false,
    kycSubmittedAt:  serverTimestamp(),
    kycRejectReason: null,
  }, { merge: true });
}

// ── Realtime KYC listener ─────────────────────────────────────────────────
export function listenKycStatus(ownerId, onChange) {
  if (!ownerId) return () => {};
  return onSnapshot(
    doc(db, 'users', ownerId),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onChange({
        kycStatus:       d.kycStatus       ?? 'not_submitted',
        isVerified:      d.isVerified      ?? false,
        accessGranted:   d.accessGranted   ?? false,
        kycRejectReason: d.kycRejectReason ?? '',
      });
    },
    (e) => console.warn('listenKycStatus:', e.message),
  );
}

// ── ADMIN: Approve KYC ───────────────────────────────────────────────────
export async function adminApproveKyc(ownerId) {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:       'verified',
    isVerified:      true,
    accessGranted:   true,
    kycVerifiedAt:   serverTimestamp(),
    kycRejectReason: null,
  });
}

// ── ADMIN: Reject KYC ───────────────────────────────────────────────────
export async function adminRejectKyc(ownerId, reason = '') {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:       'rejected',
    isVerified:      false,
    accessGranted:   false,
    kycRejectedAt:   serverTimestamp(),
    kycRejectReason: reason,
  });
}
