# AUDIT_REPORT.md
# Namma Vayal — Complete Firebase & Expo SDK 52 Audit Report
# Version: 1.1.2  |  versionCode: 15  |  Date: 2026-06-10

---

## ISSUES FOUND & FIXED

### CRITICAL — Build-Breaking Issues

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `package.json` | `expo-firebase-recaptcha ^2.3.1` present — **deprecated since Expo SDK 48**, causes Gradle build failure | Removed entirely |
| 2 | `android/app/build.gradle` | `versionCode 11` conflicts with `app.json` versionCode: 15 | Fixed to `versionCode 15` |
| 3 | `android/app/build.gradle` | `versionName "1.0.3"` conflicts with `app.json` version: 1.1.2 | Fixed to `versionName "1.1.2"` |
| 4 | `android/build.gradle` | `minSdkVersion` default `23` — below required `24` | Fixed default to `24` |
| 5 | `src/common/screens/LoginScreen.js` | Imports `FirebaseRecaptchaVerifierModal` from removed package | Removed import + ref |
| 6 | `firebase/auth.js` | `sendOTP()` requires `recaptchaVerifier` arg — broken with no package | Removed requirement; uses Firebase Play Integrity |
| 7 | `metro.config.js` | Missing `unstable_enablePackageExports = false` — Firebase 10.x broken on RN 0.76 Metro | Added fix |

### IMPORTANT — Package Version Issues

| Package | Was | Fixed To | Reason |
|---------|-----|----------|--------|
| `expo` | `~52.0.0` | `~52.0.46` | Patch with bug fixes (52.0.46 is latest stable) |
| `firebase` | `^10.8.0` | `10.13.2` | Locked exact version — `^` allows accidental v11 install which breaks RN auth |
| `expo-firebase-recaptcha` | `^2.3.1` | **REMOVED** | Deprecated since SDK 48; last npm publish 3 years ago |
| `expo-build-properties` | `~0.13.1` | `~0.13.4` | Latest SDK 52 patch |
| `expo-constants` | missing | `~17.0.8` | Required by expo-notifications for projectId lookup |
| `expo-device` | `~7.0.0` | `~7.0.2` | Latest SDK 52 patch |
| `expo-file-system` | `~18.0.4` | `~18.0.12` | Latest SDK 52 patch |
| `expo-font` | `~13.0.1` | `~13.0.4` | Latest SDK 52 patch |
| `expo-image-manipulator` | `~13.0.4` | `~13.0.6` | Latest SDK 52 patch |
| `expo-image-picker` | `~16.0.3` | `~16.0.6` | Latest SDK 52 patch |
| `expo-linear-gradient` | `~14.0.1` | `~14.0.2` | Latest SDK 52 patch |
| `expo-media-library` | `~17.0.3` | `~17.0.6` | Latest SDK 52 patch |
| `expo-notifications` | `~0.29.0` | `~0.29.14` | Latest SDK 52 patch — FCM token fixes |
| `expo-splash-screen` | `~0.29.13` | `~0.29.22` | Latest SDK 52 patch |
| `expo-status-bar` | `~2.0.0` | `~2.0.1` | Latest SDK 52 patch |
| `android.kotlinVersion` (app.json) | missing | `1.9.25` | Required by RN 0.76 Gradle |
| `com.google.gms:google-services` | `4.4.1` | `4.4.2` | Latest stable |

### FIRESTORE / STORAGE RULES

| Issue | File | Status |
|-------|------|--------|
| `isAdmin()` used hardcoded UID array `['YDr1P49RW6cDZfvo55U9kNnkTON2']` | Both rule files | FLAGGED — rules in current files still use hardcoded UID. The correct rules (from previous audit) use `sign_in_provider == 'password'` for admin. Deploy the corrected rules from `firestore.rules` and `storage.rules` in your project root. |
| `otpSessions` collection still has read/write open | `firestore.rules` | Remove this collection rule — the fake OTP system is gone |
| Catch-all `/{document=**} { allow read, write: if request.auth != null; }` | `firestore.rules` | This overrides all specific rules — remove it |
| Same catch-all in storage | `storage.rules` | Remove |

---

## HOW FIREBASE PHONE AUTH WORKS WITHOUT recaptcha (PRODUCTION)

### What changed
`expo-firebase-recaptcha` was Expo's WebView-based reCAPTCHA wrapper. It was deprecated in **SDK 48** (two years ago) and has not been updated in 3 years. In SDK 52, it causes Gradle build failures.

### How it works now
In a properly signed EAS APK/AAB, Firebase Phone Auth uses **Google Play Integrity API** (formerly SafetyNet) to verify the device automatically — no modal, no WebView, no user interaction required.

```
User enters phone → sendOTP("+91XXXXXXXXXX") → Firebase sends SMS → User enters OTP → verifyOTP(otp)
```

### One required step in Firebase Console
You MUST add your EAS build signing certificate's SHA-1 fingerprint to Firebase:

1. Get your SHA-1:
   ```
   eas credentials
   ```
   Select: Android → production → View credentials → Copy SHA-1 Fingerprint

2. Add to Firebase:
   Firebase Console → Project Settings → Your Apps → Android app (com.vayal.app)
   → Add fingerprint → Paste SHA-1 → Save

Without this step, Firebase returns `auth/app-not-authorized` error.

---

## SESSION PERSISTENCE — How It Works

1. User verifies OTP → Firebase creates an authenticated session
2. `initializeAuth()` uses `getReactNativePersistence(AsyncStorage)` — session is saved to AsyncStorage automatically
3. App restarts → `onAuthStateChanged` fires with the existing user → no OTP prompt
4. Session only clears when:
   - User explicitly logs out (calls `logout()`)
   - Firebase token expires (Firebase refreshes tokens automatically for ~1 year)
   - User revokes session in Firebase Console

---

## PUSH NOTIFICATIONS — Production Requirements

### For EAS production builds:
1. `google-services.json` is present ✅ (contains FCM config)
2. `expo-notifications ~0.29.14` installed ✅
3. `expo-device ~7.0.2` installed ✅
4. `POST_NOTIFICATIONS` permission in `app.json` ✅
5. Notification channel `vayal-default` created at app launch ✅
6. EAS build reads `google-services.json` from project root ✅

### FCM V1 API (important)
Firebase deprecated the legacy FCM HTTP API. Expo Push Service uses FCM V1 automatically.
No action needed if you use Expo Push Tokens (`getExpoPushTokenAsync`).

### Add FCM V1 credentials to EAS (if not done):
```
eas credentials
Select: Android → production → Set up FCM V1
```

---

## EXPO-DOCTOR — Expected Result After These Fixes

| Check | Result |
|-------|--------|
| `expo-firebase-recaptcha` incompatibility | ✅ FIXED (removed) |
| `@expo/config-plugins` mismatch | ✅ FIXED (patch versions updated) |
| `firebase ^10.x` version conflicts | ✅ FIXED (locked to 10.13.2) |
| `expo-constants` missing | ✅ FIXED (added ~17.0.8) |
| Android minSdkVersion < 24 | ✅ FIXED (default set to 24) |
| Package versions incompatible with SDK 52 | ✅ FIXED (all patched) |

---

## BUILD COMMANDS

```bash
# Step 1: Clean install
rm -rf node_modules package-lock.json
npm install

# Step 2: Verify (should show 0 errors)
npx expo-doctor

# Step 3: Preview APK (test on device before production)
eas build --platform android --profile preview

# Step 4: Production AAB (Google Play)
eas build --platform android --profile production

# Step 5: Submit to Play Store
eas submit --platform android
```

---

## FILES MODIFIED

| File | Change |
|------|--------|
| `package.json` | Removed `expo-firebase-recaptcha`, locked `firebase@10.13.2`, added `expo-constants`, updated all patch versions |
| `app.json` | Removed `SCHEDULE_EXACT_ALARM` permission (not needed, causes Play Store review issues), added `kotlinVersion` to build-properties |
| `android/app/build.gradle` | Fixed `versionCode 15`, `versionName "1.1.2"` |
| `android/build.gradle` | Default `minSdkVersion 24`, `kotlinVersion 1.9.25`, `google-services 4.4.2` |
| `android/gradle.properties` | Added Gradle caching/parallel, explicit SDK version props, increased JVM heap to 4GB |
| `metro.config.js` | Added `unstable_enablePackageExports = false` for Firebase 10.x compatibility |
| `firebase/config.js` | Added comments, no functional change |
| `firebase/auth.js` | Removed `recaptchaVerifier` requirement, uses Play Integrity; added `clearOTPSession`, `hasActiveOTPSession` |
| `src/common/screens/LoginScreen.js` | Removed `expo-firebase-recaptcha` import and `recaptchaVerifier` ref |
| `services/authService.js` | Removed `recaptchaVerifier` arg from `sendOTP` call |

---

## GOOGLE-SERVICES.JSON AUDIT

Your current `google-services.json` is valid and correct:
- `project_number`: 881016543795 ✅
- `project_id`: vayal-33b12 ✅
- `package_name`: com.vayal.app ✅
- `api_key`: present ✅
- `mobilesdk_app_id`: present ✅

**No changes needed to google-services.json.**

The copy in `android/app/google-services.json` must match the root `google-services.json`.
EAS handles this automatically via `"googleServicesFile": "./google-services.json"` in `app.json`.

---

## ANDROID API 35 / GOOGLE PLAY REQUIREMENTS

| Requirement | Status |
|------------|--------|
| targetSdkVersion 35 | ✅ Set via expo-build-properties |
| compileSdkVersion 35 | ✅ Set via expo-build-properties |
| minSdkVersion 24 | ✅ Fixed |
| POST_NOTIFICATIONS permission | ✅ Present |
| SCHEDULE_EXACT_ALARM removed | ✅ Removed (requires special Play Store justification) |
| AAB format for Play Store | ✅ `buildType: "app-bundle"` in eas.json production profile |
| versionCode increasing | ✅ 15 (was 11 in gradle, now consistent with app.json) |
