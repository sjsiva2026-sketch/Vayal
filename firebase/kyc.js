// firebase/kyc.js
// KYC Upload + Firestore
// NEW: vehicleImageUrl added
// FIX: submitKyc now includes vehicle image upload

import { doc, updateDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

// ── Upload image to /kyc/{ownerId}/{slot} ──────────────────────────────────
async function uploadKycImage(ownerId, imageUri, slot) {
  const res  = await fetch(imageUri);
  const blob = await res.blob();
  const ext  = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const sRef = ref(storage, `kyc/${ownerId}/${slot}.${ext}`);
  await uploadBytes(sRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(sRef);
}

// ── Submit KYC (owner) ─────────────────────────────────────────────────────
// Uploads: profile + license + aadhar + vehicle (NEW)
// Sets: kycStatus=pending, isVerified=false, accessGranted=false
export async function submitKyc({
  ownerId,
  name,
  vehicleNumber,
  profileUri,
  licenseUri,
  aadharUri,
  vehicleImageUri,   // NEW
}) {
  // Upload all images in parallel
  const uploads = [
    uploadKycImage(ownerId, profileUri,  'profile'),
    uploadKycImage(ownerId, licenseUri,  'license'),
    uploadKycImage(ownerId, aadharUri,   'aadhar'),
  ];

  if (vehicleImageUri) {
    uploads.push(uploadKycImage(ownerId, vehicleImageUri, 'vehicle'));
  }

  const results = await Promise.all(uploads);
  const [profilePhotoUrl, licenseUrl, aadharUrl] = results;
  const vehicleImageUrl = vehicleImageUri ? results[3] : null;

  await setDoc(doc(db, 'users', ownerId), {
    name,
    vehicleNumber:    vehicleNumber.trim().toUpperCase(),
    profilePhotoUrl,
    licenseUrl,
    aadharUrl,
    ...(vehicleImageUrl && { vehicleImageUrl }),
    kycStatus:        'pending',
    isVerified:       false,
    accessGranted:    false,
    kycSubmittedAt:   serverTimestamp(),
    kycRejectReason:  null,
  }, { merge: true });
}

// ── Real-time KYC listener ─────────────────────────────────────────────────
// Called from both KycScreen AND AppNavigator
// Returns unsubscribe function
export function listenKycStatus(ownerId, onChange) {
  if (!ownerId) return () => {};
  return onSnapshot(
    doc(db, 'users', ownerId),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onChange({
        kycStatus:      d.kycStatus      ?? 'not_submitted',
        isVerified:     d.isVerified     ?? false,
        accessGranted:  d.accessGranted  ?? false,
        kycRejectReason: d.kycRejectReason ?? '',
      });
    },
    (e) => console.warn('listenKycStatus:', e.message),
  );
}

// ── ADMIN: Approve KYC ────────────────────────────────────────────────────
// Sets all 3 flags — owner app auto-unlocks via onSnapshot
export async function adminApproveKyc(ownerId) {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:      'verified',
    isVerified:     true,
    accessGranted:  true,
    kycVerifiedAt:  serverTimestamp(),
    kycRejectReason: null,
  });
}

// ── ADMIN: Reject KYC ────────────────────────────────────────────────────
export async function adminRejectKyc(ownerId, reason = '') {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:       'rejected',
    isVerified:      false,
    accessGranted:   false,
    kycRejectedAt:   serverTimestamp(),
    kycRejectReason: reason,
  });
}
