# PRODUCTION_FIXES_SETUP.md
# Run these commands after pulling these changes

## Step 1 — Install new packages
npm install

## Step 2 — Clear Metro cache and rebuild
npx expo start --clear

## Step 3 — For a clean APK/AAB build
eas build --platform android --clear-cache

## What was fixed
### Issue 1 — Real OTP (Firebase Phone Auth)
- firebase/auth.js: replaced fake in-memory OTP with real signInWithPhoneNumber
- LoginScreen.js: added FirebaseRecaptchaVerifierModal (required by Firebase)
- OTPScreen.js: removed devOTP display, uses _confirmationResult.confirm(otp)
- services/authService.js: passes recaptchaVerifier ref from LoginScreen

### Issue 2 — Push Notifications
- package.json: added expo-notifications, expo-device, expo-firebase-recaptcha
- app.json: added expo-notifications plugin + POST_NOTIFICATIONS permission + notification config
- firebase/notifications.js: full implementation with setupAndroidChannel, registerForPushNotifications, FCM token saved to Firestore
- navigation/AppNavigator.js: registers push token after login, handles notification tap → navigate

### Issue 3 — Session Persistence (no re-OTP on restart)
- context/AuthContext.js: primary listener is now onAuthStateChanged (Firebase Auth)
  - Firebase Auth + AsyncStorage persistence = user stays logged in across restarts
  - Falls back to legacy AsyncStorage session for existing installs
  - OTP only required when: user logs out, Firebase token expires, or session is invalid

## Firebase Console — Required Setup
1. Firebase Console → Authentication → Sign-in method → Phone — ENABLE it
2. Firebase Console → Project Settings → Cloud Messaging — confirm Server Key is present
3. The google-services.json already in the project contains FCM config — no changes needed
4. For test devices, add phone numbers to the "Phone numbers for testing" allowlist in Firebase Console
   (this avoids SMS charges during development while keeping real Firebase Auth flow)

## Testing Checklist
- [ ] Real SMS OTP received on physical device
- [ ] Wrong OTP shows error
- [ ] Expired OTP (resend after 30s) shows correct error  
- [ ] App restart → goes directly to dashboard (no OTP)
- [ ] Logout → shows RoleSelect
- [ ] Push notification received in foreground (banner shown)
- [ ] Push notification received in background (system tray)
- [ ] Tap notification → navigates to correct screen
- [ ] Terminated app → push wakes it up
- [ ] Airplane mode → offline error shown on OTP request
