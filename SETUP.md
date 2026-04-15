# 🌾 VAYAL — Complete Setup & Run Guide

## ⚡ Quick Start (3 Steps)

```bash
# Step 1 — Install dependencies
cd "C:\Users\Guna S\Desktop\vayal"
npm install

# Step 2 — Add Firebase config (see below)

# Step 3 — Start the app
npx expo start
```

---

## 🔥 Firebase Setup (One-Time)

### 1. Create Firebase Project
- Go to https://console.firebase.google.com
- Click "Add project" → name it **vayal**
- Disable Google Analytics (optional)

### 2. Enable Phone Authentication
- Left menu → **Authentication** → Get started
- Sign-in method tab → **Phone** → Enable → Save

### 3. Add a Test Phone Number (for development)
- Authentication → Sign-in method → Phone
- Scroll down to "Phone numbers for testing"
- Add: `+91 9999999999` with OTP `123456`
- This lets you test without a real SIM

### 4. Create Firestore Database
- Left menu → **Firestore Database** → Create database
- Choose **Start in test mode** → Next
- Select region: `asia-south1` (Mumbai) → Enable

### 5. Deploy Firestore Rules & Indexes
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules,firestore:indexes
```

### 6. Get Your Config
- Project Settings (gear icon) → General → Your apps
- Click **Add app** → Web (</>) → Register app
- Copy the `firebaseConfig` object

### 7. Paste Config in firebase/config.js
```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "vayal-xxxxx.firebaseapp.com",
  projectId:         "vayal-xxxxx",
  storageBucket:     "vayal-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef",
};
```

---

## 📱 Running the App

### On your phone (recommended)
1. Install **Expo Go** from Play Store
2. Run `npx expo start`
3. Scan the QR code with your phone camera

### On Android Emulator
1. Install Android Studio + create an AVD
2. Run `npx expo start --android`

---

## 📲 Testing the Full Flow

### Test as Farmer:
1. Role Select → 👨‍🌾 Farmer
2. Enter `9999999999` → Send OTP
3. Enter `123456` → Verify
4. Fill profile → Save
5. Home → Find Machine → Book

### Test as Owner:
1. Role Select → 🚜 Machine Owner
2. Different phone number → Login
3. Add Machine → set type, price, taluk
4. Booking Requests → Accept
5. Enter OTP → Start Work → Complete

---

## 🗄️ Firestore Collections Created Automatically

| Collection | Created When |
|---|---|
| `users` | First login + profile setup |
| `machines` | Owner adds a machine |
| `bookings` | Farmer books a machine |
| `dailyPayments` | Owner completes work |

---

## 🚨 Common Issues

### "Firebase: Error (auth/operation-not-allowed)"
→ Enable Phone auth in Firebase Console

### "Firebase: Error (auth/invalid-app-credential)"
→ Add SHA-1 fingerprint for Android in Firebase Console

### App crashes on launch
→ Check `firebase/config.js` has real values (not YOUR_API_KEY)

### Firestore permission denied
→ Make sure you deployed `firestore.rules`

### OTP not received
→ Use test phone number `+91 9999999999` / OTP `123456`

---

## 📞 Phone Connect System

Every booking stores `farmerPhone` and `ownerPhone`.
The `PhoneConnect` component lets users call or WhatsApp directly.

**Farmer → Owner:**  BookingConfirm, BookingHistory
**Owner → Farmer:**  BookingRequests, WorkStartOTP, WorkInProgress, WorkComplete
**Admin → Anyone:**  UsersList, MachinesList, PaymentsList

---

## 💰 Commission Rules

- Rate: **₹30 per hectare completed**
- Accumulated per day in `dailyPayments` collection
- Owner must pay via UPI (GPay / PhonePe) daily
- Account locks at midnight if unpaid
- Unlocks immediately after payment confirmed

---

## 🎨 Color System

| Token | Hex | Use |
|---|---|---|
| primary | #1C7C54 | Buttons, headers |
| primaryLight | #4CAF82 | Highlights |
| primaryDark | #145A3E | Dark headers |
| secondary | #F4B400 | CTA, booking |
| success | #22C55E | Completed status |
| error | #EF4444 | Rejected, locked |
| warning | #F59E0B | Pending status |

---

## 🚀 Tech Stack

| Package | Version | Use |
|---|---|---|
| expo | ~50.0.0 | App framework |
| firebase | ^10.8.0 | Auth + DB + Storage |
| expo-firebase-recaptcha | ^2.4.0 | Phone OTP |
| @react-navigation/native | ^6.1.9 | Navigation |
| expo-linear-gradient | ~12.7.2 | UI gradients |
| date-fns | ^3.3.1 | Date formatting |

---

Built by GunaSekar 🔥 — VAYAL 🌾 — Farmer Machine Connect
