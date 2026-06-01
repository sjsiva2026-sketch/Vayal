// firebase/kyc.js
// OPTIMIZED: Image compression before upload (quality 0.5)
// Progress tracking — which image uploading
// All 6 parallel uploads with compressed blobs

import { doc, updateDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { db, storage } from './config';

// ── Compress image before upload ──────────────────────────────────────────
async function compressImage(uri, quality = 0.5) {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // max 800px wide
      { compress: quality, format: SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri; // fallback to original if compress fails
  }
}

// ── Upload single KYC image ───────────────────────────────────────────────
async function uploadKycImage(ownerId, imageUri, slot) {
  // Compress first
  const compressed = await compressImage(imageUri, 0.5);
  const res        = await fetch(compressed);
  const blob       = await res.blob();
  const sRef       = ref(storage, `kyc/${ownerId}/${slot}.jpg`);
  await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(sRef);
}

// ── Submit KYC — 6 images compressed + parallel upload ───────────────────
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
  onProgress, // optional: (step, total) => void
}) {
  const uploads = [
    { uri: profileUri,      slot: 'profile'       },
    { uri: licenseFrontUri, slot: 'license_front'  },
    { uri: licenseBackUri,  slot: 'license_back'   },
    { uri: aadharFrontUri,  slot: 'aadhar_front'   },
    { uri: aadharBackUri,   slot: 'aadhar_back'    },
    { uri: vehicleImageUri, slot: 'vehicle'         },
  ];

  // Upload all in parallel with progress
  let done = 0;
  const results = await Promise.all(
    uploads.map(async ({ uri, slot }) => {
      const url = await uploadKycImage(ownerId, uri, slot);
      done++;
      if (onProgress) onProgress(done, uploads.length);
      return { slot, url };
    })
  );

  // Map results
  const urlMap = {};
  results.forEach(({ slot, url }) => { urlMap[slot] = url; });

  // Save to Firestore
  await setDoc(doc(db, 'users', ownerId), {
    name,
    vehicleNumber:   vehicleNumber.trim().toUpperCase(),
    profilePhotoUrl: urlMap['profile'],
    licenseFrontUrl: urlMap['license_front'],
    licenseBackUrl:  urlMap['license_back'],
    aadharFrontUrl:  urlMap['aadhar_front'],
    aadharBackUrl:   urlMap['aadhar_back'],
    vehicleImageUrl: urlMap['vehicle'],
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
    () => {},
  );
}

// ── ADMIN: Approve KYC ────────────────────────────────────────────────────
export async function adminApproveKyc(ownerId) {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:       'verified',
    isVerified:      true,
    accessGranted:   true,
    kycVerifiedAt:   serverTimestamp(),
    kycRejectReason: null,
  });
}

// ── ADMIN: Reject KYC ─────────────────────────────────────────────────────
export async function adminRejectKyc(ownerId, reason = '') {
  await updateDoc(doc(db, 'users', ownerId), {
    kycStatus:       'rejected',
    isVerified:      false,
    accessGranted:   false,
    kycRejectedAt:   serverTimestamp(),
    kycRejectReason: reason,
  });
}
