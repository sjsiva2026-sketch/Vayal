# ✅ VAYAL — What To Do Right Now

## Your Firebase project is: vayal-33b12 ✅

---

## STEP 1 — In Firebase Console: Add Android App

1. You are on "Add app" screen
2. Click **Android** icon 🤖
3. Android package name: `com.vayal.app`
4. App nickname: `Vayal`
5. Click **Register app**
6. **Download google-services.json**
7. Save it to: `C:\Users\Guna S\Desktop\vayal\google-services.json`
   (Replace the existing placeholder file)
8. Click Next → Next → Continue to console

---

## STEP 2 — Enable Phone Authentication

1. Firebase Console → Left menu → **Authentication**
2. Click **Get started**
3. **Sign-in method** tab
4. Click **Phone** → Toggle to **Enable** → **Save**

---

## STEP 3 — Add Test Phone Numbers

1. Still in Authentication → Sign-in method → Phone
2. Scroll down to **"Phone numbers for testing"**
3. Click **Add phone number**
4. Add:
   - Phone: `+91 9999999999` → Code: `123456`
   - Phone: `+91 8888888888` → Code: `123456`
5. **Save**

---

## STEP 4 — Create Firestore Database

1. Firebase Console → Left menu → **Firestore Database**
2. Click **Create database**
3. Select **"Start in test mode"** → **Next**
4. Region: **asia-south1** → **Enable**

---

## STEP 5 — Install packages (in terminal)

```
cd "C:\Users\Guna S\Desktop\vayal"
npm install
```

---

## STEP 6 — Start the app

```
npx expo start
```

---

## STEP 7 — Test login

1. Install **Expo Go** on your Android phone (Play Store)
2. Scan QR code
3. App opens → Select Farmer
4. Enter: `9999999999`
5. OTP: `123456`
6. ✅ You're in!

---

## Your Firebase config is already saved in the app ✅
## File: firebase/config.js — no changes needed there
