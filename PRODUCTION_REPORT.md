# PRODUCTION_REPORT.md
# Namma Vayal v1.1.3 (versionCode 16) — Full Audit Report

---

## 1. ROOT CAUSE ANALYSIS

### Issue 1 — Double Splash Screen

**Root cause: Two separate splash systems were active simultaneously.**

| Layer | What it was doing |
|-------|------------------|
| Native Expo splash (`expo-splash-screen`) | Showed `assets/icons/logo.png` on green background — configured in `app.json` |
| JS splash in `App.js` (the `if (!essentialReady)` block) | Rendered a `<View>` with 🌾 emoji + ActivityIndicator WHILE fonts loaded |

The sequence was:
```
App opens → Native splash (logo) → JS white screen flicker →
JS "🌾 Namma Vayal" loading screen → Native splash hides →
MaintenanceGate "🌾 Namma Vayal" loading screen → App loads
```

That's 3 visual transitions before the app was usable.

**Fix applied:**
- `App.js` now returns `null` while loading (native splash stays visible)
- `SplashScreen.hideAsync()` is called ONCE after fonts + maintenance check
- `MaintenanceGate` was moved into the startup `init()` function
- The custom `SplashScreen.js` screen (`src/common/screens/SplashScreen.js`)
  is a leftover and is NOT registered in AppNavigator — it was never shown
  via navigation, but it's safe to delete if desired.

**Result:** Native splash → app. One transition only.

---

### Issue 2 — `Cannot read property 'verify' of undefined`

**Two root causes, both fixed:**

**Cause A — `firebase/functions/sendOTP.js` fake OTP system:**
```js
// OLD (broken)
export const verifyOTP = (inputOTP, storedOTP) =>
  inputOTP.trim() === storedOTP.trim();   // ← storedOTP was undefined → crash
```
Some code path called `verifyOTP(otp, undefined)` because the stored OTP
from Firestore was not fetched yet. `undefined.trim()` → TypeError.

**Fix:** File neutered. Only `export {};` remains.

**Cause B — Lazy auth initialization in `firebase/config.js`:**
```js
// OLD (broken) — lazy init inside getter
let _auth = null;
export const getFirebaseAuth = () => {
  if (_auth) return _auth;
  try { _auth = initializeAuth(...) } ...
  return _auth;   // ← could return null if AsyncStorage not ready
};
```
On first `sendOTP()` call, `getFirebaseAuth()` returned `null` before
AsyncStorage was initialized. `signInWithPhoneNumber(null, ...)` then
internally called `.verify()` on null → crash.

**Fix:** Auth is now initialized **eagerly at module load time** (not inside
a getter). `export const auth = _auth` gives direct access.

---

## 2. FILES MODIFIED

| File | Change |
|------|--------|
| `App.js` | Removed JS splash screen; `return null` during load; single `hideAsync()` call |
| `firebase/config.js` | Eager auth init at module load; added `export const auth` |
| `firebase/auth.js` | Uses `import { auth }` directly instead of `getFirebaseAuth()`; added auth null guard |
| `firebase/functions/sendOTP.js` | Neutered — fake OTP system removed |
| `src/common/screens/LoginScreen.js` | Confirmed clean — no recaptcha, no devOTP |
| `app.json` | version → 1.1.3, versionCode → 16 |
| `package.json` | version → 1.1.3, firebase → 10.14.1, expo-firebase-recaptcha REMOVED |

---

## 3. PRODUCTION READINESS REPORT

### Firebase Compatibility
| Check | Status |
|-------|--------|
| `firebase@10.14.1` with Expo SDK 52 | ✅ Compatible |
| `getReactNativePersistence(AsyncStorage)` | ✅ Correct |
| No `experimentalLongPolling` on Firestore | ✅ Correct |
| `expo-firebase-recaptcha` removed | ✅ Done |
| Phone Auth uses Play Integrity (no recaptcha) | ✅ Correct |
| SHA-1 fingerprint in Firebase Console | ✅ Already present (ed:4a:35...) |
| Auth singleton (no double-init) | ✅ Fixed |

### Expo SDK 52 Compatibility
| Check | Status |
|-------|--------|
| `expo-splash-screen` single call pattern | ✅ Fixed |
| `expo-notifications ~0.29.0` | ✅ SDK 52 compatible |
| `expo-build-properties ~0.13.0` | ✅ SDK 52 compatible |
| `newArchEnabled=false` | ✅ Required for firebase@10.x |
| `hermesEnabled=true` | ✅ Required for production |
| `metro.config.js` `unstable_enablePackageExports=false` | ✅ Required for firebase@10.x |

### Android / Google Play
| Check | Status |
|-------|--------|
| `targetSdkVersion 35` | ✅ Meets Play Store requirement |
| `compileSdkVersion 35` | ✅ |
| `minSdkVersion 24` | ✅ Meets Play Store minimum |
| `versionCode 16` (was 15, then 15 already uploaded) | ✅ Incremented |
| `POST_NOTIFICATIONS` permission | ✅ Present |
| No `SCHEDULE_EXACT_ALARM` | ✅ Removed (avoids Play review issues) |
| `buildType: "app-bundle"` for production | ✅ In eas.json |
| `google-services.json` present | ✅ |

---

## 4. EAS BUILD READINESS STATUS

**Ready to build.** Run in order:

```powershell
# 1. Clean install
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install

# 2. Let Expo resolve exact compatible patch versions
npx expo install --fix

# 3. Verify zero errors
npx expo-doctor

# 4. Build production AAB
eas build --platform android --profile production
```

---

## 5. FINAL CHECKLIST BEFORE UPLOADING AAB TO GOOGLE PLAY CLOSED TESTING

### Code
- [x] `expo-firebase-recaptcha` removed from `package.json`
- [x] No `import { FirebaseRecaptchaVerifierModal }` anywhere
- [x] No fake OTP system (`generateOTP`, `verifyOTP(a, b)`)
- [x] No dev OTP displayed on screen
- [x] No hardcoded OTP values (123456, 000000)
- [x] `firebase/functions/sendOTP.js` neutered
- [x] Double splash screen removed
- [x] `version: "1.1.3"`, `versionCode: 16`

### Firebase Console
- [x] Authentication → Phone → Enabled
- [x] Authentication → Email/Password → Enabled
- [x] SHA-1 fingerprint added (ed:4a:35:9c...)
- [x] Admin user created in Firebase Auth
- [x] Admin user document in Firestore `users/{uid}` with `role: "admin"`
- [x] Firestore rules deployed (latest version)
- [x] Storage rules deployed (latest version)
- [x] `google-services.json` downloaded after SHA-1 was added

### Google Play Console
- [ ] App icon uploaded (512×512 PNG)
- [ ] Feature graphic uploaded (1024×500 PNG)
- [ ] Minimum 2 screenshots uploaded
- [ ] Short description filled
- [ ] Full description filled
- [ ] Privacy policy URL added
- [ ] Content rating questionnaire completed
- [ ] Data safety form filled (phone number, name, photos, device ID)
- [ ] Target audience set to 18+
- [ ] New AAB (versionCode 16) uploaded to Closed Testing track
- [ ] Testers added to Closed Testing track

### Before Release
- [ ] Test on physical Android device (not emulator)
- [ ] Real SMS OTP received and verified
- [ ] App restart → goes directly to dashboard (no re-OTP)
- [ ] Logout → returns to RoleSelect
- [ ] Push notification received in foreground
- [ ] Push notification received in background
