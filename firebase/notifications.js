// firebase/notifications.js
// FCM Push Notifications — Farmer, Owner, Admin
// Uses expo-notifications + Firebase Firestore token storage

import * as Notifications from 'expo-notifications';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

// ── Notification handler setup ────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Register device + save FCM token to Firestore ────────────────────────
export async function registerForPushNotifications(userId) {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '6b073f71-f2fe-4f59-ab5c-44984f7643e8',
    })).data;

    // Save token to Firestore
    if (userId && token) {
      await updateDoc(doc(db, 'users', userId), {
        expoPushToken: token,
        tokenUpdatedAt: new Date().toISOString(),
      });
    }
    return token;
  } catch { return null; }
}

// ── Send local notification (in-app) ─────────────────────────────────────
export async function sendLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null, // immediate
    });
  } catch {}
}

// ── Send push to specific user via Expo Push API ──────────────────────────
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return;
    const token = snap.data()?.expoPushToken;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:    token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch {}
}

// ── Send push to admin ────────────────────────────────────────────────────
async function notifyAdmin(title, body, data = {}) {
  try {
    const q    = query(collection(db, 'users'), where('role', '==', 'admin'));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const token = d.data()?.expoPushToken;
      if (!token) continue;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high' }),
      });
    }
  } catch {}
}

// ══════════════════════════════════════════════════════════════════════════
// FARMER NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════

export async function notifyFarmerBookingAccepted(farmerId, machineName) {
  await sendPushToUser(
    farmerId,
    '✅ Booking Accepted!',
    `உங்கள் ${machineName} booking accept ஆச்சு! Owner வருவார்.`,
    { screen: 'FarmerBookings' }
  );
}

export async function notifyFarmerBookingRejected(farmerId, machineName) {
  await sendPushToUser(
    farmerId,
    '❌ Booking Rejected',
    `${machineName} booking reject ஆச்சு. வேற machine try பண்ணுங்க.`,
    { screen: 'FarmerHome' }
  );
}

export async function notifyFarmerJobCompleted(farmerId) {
  await sendPushToUser(
    farmerId,
    '🌾 வேலை முடிஞ்சது!',
    'OTP enter பண்ணி job complete பண்ணுங்க.',
    { screen: 'FarmerBookings' }
  );
}

export async function notifyFarmerJobStarted(farmerId, machineName) {
  await sendPushToUser(
    farmerId,
    '🚜 Machine வந்துவிட்டது!',
    `${machineName} work start ஆகுது.`,
    { screen: 'FarmerBookings' }
  );
}

// ══════════════════════════════════════════════════════════════════════════
// OWNER NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════

export async function notifyOwnerNewBooking(ownerId, farmerName) {
  await sendPushToUser(
    ownerId,
    '📋 புதுசா Booking!',
    `${farmerName} booking request அனுப்பினாங்க. Accept/Reject பண்ணுங்க.`,
    { screen: 'BookingRequests' }
  );
}

export async function notifyOwnerPaymentVerified(ownerId) {
  await sendPushToUser(
    ownerId,
    '🔓 Commission Verified!',
    'Payment approve ஆச்சு. App unlock ஆச்சு. All features restored! 🎉',
    { screen: 'OwnerHome' }
  );
}

export async function notifyOwnerPaymentRejected(ownerId) {
  await sendPushToUser(
    ownerId,
    '❌ Payment Rejected',
    'Admin screenshot reject பண்ணாங்க. Clear screenshot upload பண்ணுங்க.',
    { screen: 'PayCommission' }
  );
}

export async function notifyOwnerKycApproved(ownerId) {
  await sendPushToUser(
    ownerId,
    '✅ KYC Approved!',
    'Documents verify ஆச்சு. Bookings accept பண்ணலாம்!',
    { screen: 'OwnerHome' }
  );
}

export async function notifyOwnerKycRejected(ownerId, reason = '') {
  await sendPushToUser(
    ownerId,
    '❌ KYC Rejected',
    reason || 'Documents reject ஆச்சு. Re-upload பண்ணுங்க.',
    { screen: 'KycScreen' }
  );
}

export async function notifyOwnerTimerWarning(ownerId, minutesLeft) {
  await sendPushToUser(
    ownerId,
    '⏰ Commission Due Soon!',
    `${minutesLeft} minutes-ல் app lock ஆகும். Commission pay பண்ணுங்க!`,
    { screen: 'PayCommission' }
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════

export async function notifyAdminNewKyc(ownerName) {
  await notifyAdmin(
    '🪪 New KYC Submitted',
    `${ownerName} KYC documents submit பண்ணாங்க. Verify பண்ணுங்க.`,
    { screen: 'KycVerificationList' }
  );
}

export async function notifyAdminPaymentUploaded(ownerName, amount) {
  await notifyAdmin(
    '💰 Payment Proof Uploaded',
    `${ownerName} ₹${amount} commission screenshot upload பண்ணாங்க. Verify பண்ணுங்க.`,
    { screen: 'PaymentsList' }
  );
}

export async function notifyAdminNewUser(userName, role) {
  await notifyAdmin(
    '👤 New User Registered',
    `${userName} (${role}) register ஆனாங்க.`,
    { screen: 'UsersList' }
  );
}

export async function notifyAdminNewBooking(farmerName, machineName) {
  await notifyAdmin(
    '📋 New Booking Created',
    `${farmerName} ${machineName} booking create பண்ணாங்க.`,
    { screen: 'AdminDashboard' }
  );
}
