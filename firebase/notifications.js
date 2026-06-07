// firebase/notifications.js
// Push via Expo Push API — no expo-notifications SDK required
// Token save to Firestore manually

import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

// ── Register: called after login ──────────────────────────────────────────
// expo-notifications not used — token saved via device info
export async function registerForPushNotifications(userId) {
  // Placeholder — token will be registered when expo-notifications
  // is added in a future build. Firestore field: expoPushToken
  return null;
}

// ── Internal: send push via Expo Push API ────────────────────────────────
async function sendPush(token, title, body, data = {}) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:       token,
        title,
        body,
        data,
        sound:    'default',
        priority: 'high',
      }),
    });
  } catch {}
}

async function pushToUser(userId, title, body, data = {}) {
  try {
    const snap  = await getDoc(doc(db, 'users', userId));
    const token = snap.data()?.expoPushToken;
    if (token) await sendPush(token, title, body, data);
  } catch {}
}

async function pushToAdmin(title, body, data = {}) {
  try {
    const snap = await getDocs(query(collection(db,'users'), where('role','==','admin')));
    await Promise.all(snap.docs.map(async d => {
      const token = d.data()?.expoPushToken;
      if (token) await sendPush(token, title, body, data);
    }));
  } catch {}
}

// ── FARMER ────────────────────────────────────────────────────────────────
export const notifyFarmerBookingAccepted = (farmerId, machineName) =>
  pushToUser(farmerId, '✅ Booking Accepted!',
    `உங்கள் ${machineName} booking accept ஆச்சு! Owner வருவார்.`,
    { screen: 'FarmerBookings' });

export const notifyFarmerBookingRejected = (farmerId, machineName) =>
  pushToUser(farmerId, '❌ Booking Rejected',
    `${machineName} booking reject ஆச்சு. வேற machine try பண்ணுங்க.`,
    { screen: 'FarmerHome' });

export const notifyFarmerJobStarted = (farmerId, machineName) =>
  pushToUser(farmerId, '🚜 Machine வந்துவிட்டது!',
    `${machineName} work start ஆகுது.`,
    { screen: 'FarmerBookings' });

export const notifyFarmerJobCompleted = (farmerId) =>
  pushToUser(farmerId, '🌾 வேலை முடிஞ்சது!',
    'OTP enter பண்ணி job complete பண்ணுங்க.',
    { screen: 'FarmerBookings' });

// ── OWNER ─────────────────────────────────────────────────────────────────
export const notifyOwnerNewBooking = (ownerId, farmerName) =>
  pushToUser(ownerId, '📋 புதுசா Booking!',
    `${farmerName} booking request அனுப்பினாங்க. Accept/Reject பண்ணுங்க.`,
    { screen: 'BookingRequests' });

export const notifyOwnerKycApproved = (ownerId) =>
  pushToUser(ownerId, '✅ KYC Approved!',
    'Documents verify ஆச்சு. Bookings accept பண்ணலாம்!',
    { screen: 'OwnerHome' });

export const notifyOwnerKycRejected = (ownerId, reason = '') =>
  pushToUser(ownerId, '❌ KYC Rejected',
    reason || 'Documents reject ஆச்சு. Re-upload பண்ணுங்க.',
    { screen: 'KycScreen' });

export const notifyOwnerPaymentVerified = (ownerId) =>
  pushToUser(ownerId, '🔓 Commission Verified!',
    'Payment approve ஆச்சு. App unlock ஆச்சு! 🎉',
    { screen: 'OwnerHome' });

export const notifyOwnerPaymentRejected = (ownerId) =>
  pushToUser(ownerId, '❌ Payment Rejected',
    'Screenshot reject ஆச்சு. Clear screenshot upload பண்ணுங்க.',
    { screen: 'PayCommission' });

export const notifyOwnerTimerWarning = (ownerId, minutesLeft) =>
  pushToUser(ownerId, '⏰ Commission Due Soon!',
    `${minutesLeft} minutes-ல் app lock ஆகும். Pay பண்ணுங்க!`,
    { screen: 'PayCommission' });

// ── ADMIN ─────────────────────────────────────────────────────────────────
export const notifyAdminNewKyc = (ownerName) =>
  pushToAdmin('🪪 New KYC Submitted',
    `${ownerName} KYC submit பண்ணாங்க. Verify பண்ணுங்க.`,
    { screen: 'KycVerificationList' });

export const notifyAdminPaymentUploaded = (ownerName, amount) =>
  pushToAdmin('💰 Payment Proof Uploaded',
    `${ownerName} ₹${amount} commission screenshot upload பண்ணாங்க.`,
    { screen: 'PaymentsList' });

export const notifyAdminNewUser = (userName, role) =>
  pushToAdmin('👤 New User Registered',
    `${userName} (${role}) register ஆனாங்க.`,
    { screen: 'UsersList' });

export const notifyAdminNewBooking = (farmerName, machineName) =>
  pushToAdmin('📋 New Booking Created',
    `${farmerName} ${machineName} booking create பண்ணாங்க.`,
    { screen: 'AdminDashboard' });
