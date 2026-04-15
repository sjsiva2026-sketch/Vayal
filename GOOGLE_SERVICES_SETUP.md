# 🌾 VAYAL — Google Services Setup

## Step 1: Download google-services.json
1. Go to https://console.firebase.google.com
2. Select your vayal project
3. Project Settings (gear icon) → General tab
4. Scroll to "Your apps" → Android app
5. If no Android app exists, click "Add app" → Android
   - Package name: com.vayal.app
   - App nickname: Vayal Android
   - Click Register app
6. Download google-services.json
7. Place it here: C:\Users\Guna S\Desktop\vayal\google-services.json

## Step 2: Add SHA-1 Fingerprint (required for Phone Auth)
Run this in your terminal:
  cd "C:\Users\Guna S\Desktop\vayal"
  npx expo credentials:manager

OR for debug SHA-1:
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

Then add the SHA-1 in Firebase Console → Project Settings → Your Android app → Add fingerprint

## Step 3: Enable Phone Auth in Firebase
Firebase Console → Authentication → Sign-in method → Phone → Enable

## Step 4: Add test phone number
Firebase Console → Authentication → Sign-in method → Phone
→ Phone numbers for testing
→ Add: +91 9999999999 / OTP: 123456
