// firebase/notifications.js
// Push Notifications — Farmer, Owner, Admin
// expo-notifications + Expo Push API

import * as Notifications from 'expo-notifications';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

const PROJECT_ID = '6b073f71-f2fe-4f59-ab5c-44984f7643e8';

// ── Setup notification handler ────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Register device + save token ─────────────────────────────────────────
export async function registerForPushNotifications(userId) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
    }
    if (status !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    })).data;

    if (userId && token) {
      await updateDoc(doc(db, 'users', userId), {
        expoPushToken:  token,
        tokenUpdatedAt: new Date().toISOString(),
      });
    }
    return token;
  } catch { return null; }
}

// ── Send to user ──────────────────────────────────────────────────────────
async function pushToUser(userId, title, body, data = {}) {
  try {
    const snap  = await getDoc(doc(db, 'users', userId));
    const token = snap.data()?.expoPushToken;
    if (!token) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to:token, title, body, data, sound:'default', priority:'high' }),
    });
  } catch {}
}

// ── Send to admin ─────────────────────────────────────────────────────────
async function pushToAdmin(title, body, data = {}) {
  try {
    const snap = await getDocs(query(collection(db,'users'), where('role','==','admin')));
    await Promise.all(snap.docs.map(async d => {
      const token = d.data()?.expoPushToken;
      if (!token) return;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to:token, title, body, data, sound:'default', priority:'high' }),
      });
    }));
  } catch {}
}

// ══════════════════════════════════════════════════════════
// FARMER
// ══════════════════════════════════════════════════════════
export const notifyFarmerBookingAccepted = (farmerId, machineName) =>
  pushToUser(farmerId,
    '✅ Booking Accepted!',
    `உங்கள் ${machineName} booking accept ஆச்சு! Owner வருவார்.`,
    { screen:'FarmerBookings' });

export const notifyFarmerBookingRejected = (farmerId, machineName) =>
  pushToUser(farmerId,
    '❌ Booking Rejected',
    `${machineName} booking reject ஆச்சு. வேற machine try பண்ணுங்க.`,
    { screen:'FarmerHome' });

export const notifyFarmerJobStarted = (farmerId, machineName) =>
  pushToUser(farmerId,
    '🚜 Machine வந்துவிட்டது!',
    `${machineName} work start ஆகுது.`,
    { screen:'FarmerBookings' });

export const notifyFarmerJobCompleted = (farmerId) =>
  pushToUser(farmerId,
    '🌾 வேலை முடிஞ்சது!',
    'OTP enter பண்ணி job complete பண்ணுங்க.',
    { screen:'FarmerBookings' });

// ══════════════════════════════════════════════════════════
// OWNER
// ══════════════════════════════════════════════════════════
export const notifyOwnerNewBooking = (ownerId, farmerName) =>
  pushToUser(ownerId,
    '📋 புதுசா Booking!',
    `${farmerName} booking request அனுப்பினாங்க. Accept/Reject பண்ணுங்க.`,
    { screen:'BookingRequests' });

export const notifyOwnerKycApproved = (ownerId) =>
  pushToUser(ownerId,
    '✅ KYC Approved!',
    'Documents verify ஆச்சு. Bookings accept பண்ணலாம்!',
    { screen:'OwnerHome' });

export const notifyOwnerKycRejected = (ownerId, reason = '') =>
  pushToUser(ownerId,
    '❌ KYC Rejected',
    reason || 'Documents reject ஆச்சு. Re-upload பண்ணுங்க.',
    { screen:'KycScreen' });

export const notifyOwnerPaymentVerified = (ownerId) =>
  pushToUser(ownerId,
    '🔓 Commission Verified!',
    'Payment approve ஆச்சு. App unlock ஆச்சு! 🎉',
    { screen:'OwnerHome' });

export const notifyOwnerPaymentRejected = (ownerId) =>
  pushToUser(ownerId,
    '❌ Payment Rejected',
    'Screenshot reject ஆச்சு. Clear screenshot upload பண்ணுங்க.',
    { screen:'PayCommission' });

export const notifyOwnerTimerWarning = (ownerId, minutesLeft) =>
  pushToUser(ownerId,
    '⏰ Commission Due Soon!',
    `${minutesLeft} minutes-ல் app lock ஆகும். Pay பண்ணுங்க!`,
    { screen:'PayCommission' });

// ══════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════
export const notifyAdminNewKyc = (ownerName) =>
  pushToAdmin(
    '🪪 New KYC Submitted',
    `${ownerName} KYC submit பண்ணாங்க. Verify பண்ணுங்க.`,
    { screen:'KycVerificationList' });

export const notifyAdminPaymentUploaded = (ownerName, amount) =>
  pushToAdmin(
    '💰 Payment Proof Uploaded',
    `${ownerName} ₹${amount} commission screenshot upload பண்ணாங்க.`,
    { screen:'PaymentsList' });

export const notifyAdminNewUser = (userName, role) =>
  pushToAdmin(
    '👤 New User Registered',
    `${userName} (${role}) register ஆனாங்க.`,
    { screen:'UsersList' });

export const notifyAdminNewBooking = (farmerName, machineName) =>
  pushToAdmin(
    '📋 New Booking Created',
    `${farmerName} ${machineName} booking create பண்ணாங்க.`,
    { screen:'AdminDashboard' });
