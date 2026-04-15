# 🌾 VAYAL — START HERE

## You need to do exactly 3 things to run this app.

---

## ✅ STEP 1 — Install Dependencies

Open terminal in `C:\Users\Guna S\Desktop\vayal\` and run:

```
npm install
```

Wait for it to finish (2-3 minutes).

---

## ✅ STEP 2 — Setup Firebase (10 minutes, one time only)

### A. Create project
1. Go to → https://console.firebase.google.com
2. Click "Add project" → Name: **vayal** → Continue → Create

### B. Enable Phone Login
3. Left menu → **Authentication** → Get started
4. Sign-in method tab → **Phone** → Enable → Save

### C. Add a test phone number (no SIM needed!)
5. Still in Authentication → Sign-in method → Phone
6. Scroll to **"Phone numbers for testing"** → Add:
   - Phone number: `+91 9999999999`
   - Verification code: `123456`
7. Click Save

### D. Create Firestore Database
8. Left menu → **Firestore Database** → Create database
9. Select **"Start in test mode"** → Next
10. Region: **asia-south1** → Enable

### E. Get your config
11. Click ⚙️ (gear icon) → Project Settings → General
12. Scroll to **"Your apps"** → click **`</>`** (Web icon)
13. App nickname: `vayal-web` → Register app
14. Copy the `firebaseConfig` object that appears

### F. Paste config into the app
15. Open: `C:\Users\Guna S\Desktop\vayal\firebase\config.js`
16. Replace the placeholder values:

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

## ✅ STEP 3 — Run the App

```
npx expo start
```

Then:
- **On your phone** → Install "Expo Go" from Play Store → Scan QR code
- **On emulator** → Press `A` for Android

---

## 📱 Test User Flow

### Test as Farmer:
1. Open app → Select **"Farmer 👨‍🌾"**
2. Enter phone: `9999999999` → Send OTP
3. Enter OTP: `123456` → Verify
4. Fill profile → Enter district + taluk → Save
5. Home → **"Book a Machine"** → Select category

### Test as Owner (different phone number):
1. Go back to role select → **"Owner 🚜"**
2. Add test number `+91 8888888888` / OTP `123456` in Firebase Console
3. Login → Add Machine → set type + price + taluk
4. Booking Requests → Accept booking → Enter OTP → Complete

---

## 🎯 Full Flow

```
Farmer:   Books machine → gets OTP
                 ↓
Owner:    Sees booking → calls farmer (📞) → Accepts
                 ↓
At field: Farmer gives OTP to Owner
                 ↓
Owner:    Enters OTP → Work starts
                 ↓
Owner:    Work done → enters hectare → commission calculated
                 ↓
Owner:    Pays ₹30/hectare via UPI → account unlocked ✅
```

---

## 🔑 Key Files

| File | What to edit |
|------|-------------|
| `firebase/config.js` | ← **ONLY FILE YOU NEED TO EDIT** |
| `google-services.json` | Replace with downloaded file (Android builds) |
| `constants/config.js` | Change commission rate, time slots, districts |
| `constants/colors.js` | Change app theme colors |

---

## ❓ Problems?

| Problem | Fix |
|---------|-----|
| `npm install` fails | Make sure Node.js 18+ is installed |
| Firebase error | Check config values in `firebase/config.js` |
| OTP not working | Use test number `+91 9999999999` / OTP `123456` |
| "Permission denied" | Set Firestore to test mode in Firebase Console |
| App shows blank | Check terminal for errors; check Firebase config |
| Phone auth error | Enable Phone auth in Firebase Console |

---

## 📞 Phone Connect Feature

Every booking stores both `farmerPhone` and `ownerPhone`.
Tap any booking → see **Call** and **WhatsApp** buttons.

Works on: BookingConfirm, BookingHistory, BookingRequests,
          WorkStartOTP, WorkInProgress, WorkComplete,
          Admin UsersList, MachinesList, PaymentsList

---

Built by GunaSekar 🔥 | VAYAL 🌾 | Farmer–Machine Connect
