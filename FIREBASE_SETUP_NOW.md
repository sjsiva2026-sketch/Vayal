# 🔥 VAYAL Firebase Setup — Do These Steps NOW

Your Firebase project: vayal-33b12 ✅
Your config is already in firebase/config.js ✅

You need to enable 3 things in Firebase Console:

---

## OPEN THIS LINK:
👉 https://console.firebase.google.com/project/vayal-33b12/overview

---

## ✅ STEP 1 — Enable Phone Authentication

1. Click this link directly:
   https://console.firebase.google.com/project/vayal-33b12/authentication

2. Click "Get started" (if first time)

3. Click "Sign-in method" tab

4. Find "Phone" in the list → Click it

5. Toggle the switch to ENABLE → Click "Save"

6. Scroll down to "Phone numbers for testing"

7. Click "Add phone number" → Enter:
   Phone:  +91 9999999999
   Code:   123456
   Click Add

8. Click "Add phone number" again → Enter:
   Phone:  +91 8888888888
   Code:   123456
   Click Add

9. Click SAVE ✅

---

## ✅ STEP 2 — Create Firestore Database

1. Click this link:
   https://console.firebase.google.com/project/vayal-33b12/firestore

2. Click "Create database"

3. Select "Start in TEST MODE" ← IMPORTANT
   (This allows the app to read/write without login restrictions)

4. Click "Next"

5. Select region: asia-south1 (Mumbai — closest to Tamil Nadu)

6. Click "Enable"

7. Wait 30 seconds for it to create ✅

---

## ✅ STEP 3 — Verify Android App is Registered

1. Click this link:
   https://console.firebase.google.com/project/vayal-33b12/settings/general

2. Scroll down to "Your apps"

3. If you see an Android app with package "com.vayal.app" → GOOD ✅

4. If NOT, click Android icon → Enter:
   Package name: com.vayal.app
   → Register app → Download google-services.json
   → Copy to C:\Users\Guna S\Desktop\vayal\

---

## ✅ STEP 4 — Test the App

After doing steps 1-3, run:
   npx expo start

Then in the app:
1. Tap "Farmer 👨‍🌾"
2. Enter phone: 9999999999
3. Tap "Send OTP"
4. Enter OTP: 123456
5. Fill profile → Save
6. You're in! ✅

---

## ❓ WHY WAS SPLASH SCREEN LOOPING?

The app was stuck because:
- Firebase auth was loading → showed spinner ✅
- User not logged in → should show RoleSelect
- But Firestore wasn't set up → the app got confused

NOW FIXED:
- Splash screen shows for 2 seconds then goes to RoleSelect automatically
- If user is not logged in → RoleSelect appears
- If user is logged in → goes directly to Farmer/Owner home

---

## ❓ COMMON ERRORS AND FIXES

| Error | Fix |
|-------|-----|
| "auth/operation-not-allowed" | Enable Phone auth in Step 1 |
| "permission-denied" | Create Firestore in test mode (Step 2) |
| OTP not working | Add test numbers in Firebase Console |
| Splash screen loops | Already fixed! ✅ |
| Login button does nothing | Check Firebase config in firebase/config.js |
