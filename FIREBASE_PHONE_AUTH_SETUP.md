# 📱 VAYAL — Phone Authentication Setup

## Why is phone login not working in Expo Go?

Firebase Phone Auth requires a **native build** for real SMS.
In Expo Go (development), use **test phone numbers** instead.

---

## ✅ Setup Test Phone Numbers (works in Expo Go)

1. Go to https://console.firebase.google.com
2. Select your vayal project
3. Left menu → **Authentication** → **Sign-in method**
4. Scroll down to **"Phone numbers for testing"**
5. Click **"Add phone number"**
6. Add these test numbers:

| Phone Number    | Verification Code |
|-----------------|-------------------|
| +91 9999999999  | 123456            |
| +91 8888888888  | 123456            |
| +91 7777777777  | 123456            |

7. Click **Save**

Now in the app:
- Enter: `9999999999` (10 digits, no +91)
- OTP: `123456`
- ✅ Login works!

---

## 📲 For Real SMS (Production Build)

To send real OTPs to any phone number, you need:

1. Build a proper APK (not Expo Go):
   ```
   npx expo build:android
   ```
   OR with EAS:
   ```
   eas build --platform android
   ```

2. Get the SHA-1 fingerprint of your APK
3. Add it to Firebase Console → Project Settings → Android app → SHA certificates

---

## 🔧 Current Auth Flow in Vayal

```
User enters phone → sendOTP(+91XXXXXXXXXX)
   ↓
Firebase checks if it's a test number
   ↓ YES → Returns test OTP (123456)
   ↓ NO  → Sends real SMS (needs native build + SHA-1)

User enters OTP → verifyOTP(otp)
   ↓
Firebase confirms → user logged in ✅
```

---

## ❓ Error: "INVALID_APP_CREDENTIAL"

This means Firebase can't verify your app.
**Fix:** Use test phone numbers during development.

## ❓ Error: "TOO_MANY_ATTEMPTS_TRY_LATER"

Too many OTP requests.
**Fix:** Wait 1 hour or use a different test phone number.
