// firebase/notifications.js
// Push notifications via Expo Notifications SDK + FCM
// Handles token registration, foreground/background/terminated states
// Updated: reads projectId from Constants (canonical SDK 52 pattern)

import * as Notifications from 'expo-notifications';
import * as Device        from 'expo-device';
import Constants          from 'expo-constants';
import { Platform }       from 'react-native';
import {
  doc, updateDoc, getDoc, collection, query, where, getDocs,
} from 'firebase/firestore';
import { db } from './config';

// ── Foreground notification behaviour ────────────────────────────────────
// Show notification banner + sound even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Android notification channel ─────────────────────────────────────────
export async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('vayal-default', {
    name:             'Vayal Notifications',
    importance:       Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       '#1C7C54',
    sound:            'default',
    enableVibrate:    true,
    showBadge:        true,
  });
}

// ── Request permission + get Expo Push Token ─────────────────────────────
export async function registerForPushNotifications(userId) {
  try {
    if (!Device.isDevice) {
      console.warn('[Notifications] Push notifications only work on physical devices.');
      return null;
    }

    await setupAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission denied by user.');
      return null;
    }

    // Read projectId from Constants — canonical approach for Expo SDK 52
    // Falls back to hardcoded value if Constants not yet populated
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      '6b073f71-f2fe-4f59-ab5c-44984f7643e8';

    if (!projectId) {
      console.warn('[Notifications] No EAS project ID found.');
      return null;
    }

    // Get Expo push token (backed by FCM on Android via google-services.json)
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    if (!token) return null;

    // Persist token + refresh timestamp to Firestore user document
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        expoPushToken:    token,
        pushPlatform:     Platform.OS,
        pushTokenUpdated: new Date().toISOString(),
      }).catch(e => console.warn('[Notifications] Token save failed:', e.message));
    }

    return token;
  } catch (e) {
    console.warn('[Notifications] registerForPushNotifications error:', e.message);
    return null;
  }
}

// ── Internal: send push via Expo Push API ────────────────────────────────
async function sendPush(token, title, body, data = {}) {
  if (!token) return;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'Accept':          'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to:         token,
        title,
        body,
        data,
        sound:      'default',
        priority:   'high',
        channelId:  'vayal-default',
        badge:       1,
        ttl:         3600,
        expiration:  Math.floor(Date.now() / 1000) + 3600,
      }),
    });
    const json = await response.json();
    if (json?.data?.status === 'error') {
      console.warn('[Notifications] Push failed:', json.data.message);
    }
  } catch (e) {
    console.warn('[Notifications] sendPush error:', e.message);
  }
}

async function pushToUser(userId, title, body, data = {}) {
  try {
    const snap  = await getDoc(doc(db, 'users', userId));
    const token = snap.data()?.expoPushToken;
    if (token) await sendPush(token, title, body, data);
  } catch (e) {
    console.warn('[Notifications] pushToUser error:', e.message);
  }
}

async function pushToAdmin(title, body, data = {}) {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    await Promise.all(snap.docs.map(async d => {
      const token = d.data()?.expoPushToken;
      if (token) await sendPush(token, title, body, data);
    }));
  } catch (e) {
    console.warn('[Notifications] pushToAdmin error:', e.message);
  }
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
