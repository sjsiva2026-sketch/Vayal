# FIREBASE_PRODUCTION_REFERENCE.md
# Namma Vayal — Firebase setup, rules, versions, and API key guide

---

## 1. Package Versions (Expo SDK 52 compatible)

| Package | Version in package.json | Notes |
|---|---|---|
| expo | ~52.0.0 | SDK 52 |
| firebase | ^10.8.0 | JS SDK v10 — modular API |
| expo-notifications | ~0.29.0 | FCM push on Android |
| expo-device | ~7.0.0 | Required by expo-notifications |
| expo-firebase-recaptcha | ~2.4.0 | Required for Phone Auth on RN |
| @react-native-async-storage/async-storage | 1.23.1 | Auth persistence |
| react-native | 0.76.9 | Expo SDK 52 default |
| expo-image-manipulator | ~13.0.4 | KYC image compression |

**Do NOT upgrade firebase beyond ^10.x for now.**
firebase 11.x changes auth import paths and breaks React Native persistence.

---

## 2. Firebase Console — One-Time Setup Checklist

### Authentication
- [ ] Sign-in method → **Phone** → Enable
- [ ] Sign-in method → **Email/Password** → Enable (for admin login)
- [ ] Go to **Users** → Add user → `admin@nammaVayal.com` + password of your choice
      After creating, copy that user's UID → paste it in Firestore:
      `users/{that_uid}` → `{ role: "admin", name: "Admin", email: "admin@nammaVayal.com" }`

### Phone Auth Test Numbers (optional, saves SMS cost during development)
- Firebase Console → Authentication → Sign-in method → Phone
  → Scroll to "Phone numbers for testing"
  → Add: +91XXXXXXXXXX  →  Code: 123456
  This bypasses real SMS for that number only — all other numbers get real SMS.

### Firestore Database
- Already created on Blaze plan ✅
- Deploy updated rules (see Section 4 below)

### Storage
- Already on Blaze plan ✅
- Deploy updated rules (see Section 5 below)

### Cloud Messaging (FCM)
- Firebase Console → Project Settings → Cloud Messaging
- Server key should already exist (created when project was set up)
- No action needed — google-services.json already contains FCM config
- Expo Push Service reads FCM config automatically from EAS build

---

## 3. API Key — What It Is, What It Does, What NOT to Do

### Your API Key
```
AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4
```

### What this key does
- Identifies your Firebase project to Google's servers
- Used by the Firebase JS SDK in the app (Auth, Firestore, Storage calls)
- Required in both `firebase/config.js` and `google-services.json`
- It is a **project identifier**, not a secret password

### Is it safe to have it in the app?
**Yes — by design.**
Google's official documentation explicitly states that Firebase API keys
in client apps are safe to be publicly visible. Security is enforced by:
- Firestore security rules (who can read/write which documents)
- Storage security rules (who can upload/download which files)
- Firebase Auth (only authenticated users can access data)
- App restrictions in Google Cloud Console (package name + SHA-1 lock)

### What you MUST NOT do
- Never put your Firebase **Service Account** JSON in the app
  (that file has admin SDK powers — backend use only)
- Never put Firebase **Admin SDK** credentials in client code

### Restrict your API key (recommended extra step — no app changes needed)
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your API key → Application restrictions → Android apps
3. Add: Package name `com.vayal.app` + your APK's SHA-1 fingerprint
4. This means the key only works from your signed APK — not from curl/Postman

To get your SHA-1 fingerprint:
```
# For EAS builds — get from EAS dashboard
eas credentials

# For local debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## 4. Firestore Rules — What Changed

### Old rules (problems)
- Used `signInAnonymously` → any anonymous user could write to any collection
- `isAdmin()` used a hardcoded UID array — fragile, impossible to maintain
- `otpSessions` collection was publicly writable (stored the fake OTP!)
- Missing `isBlocked` and `role` in protected admin fields

### New rules (fixed)
```
isSignedIn()  → request.auth.token.firebase.sign_in_provider == 'phone'
              → only REAL phone-verified users, not anonymous
isAdmin()     → sign_in_provider == 'password'  (email login)
              + Firestore get() confirms role == 'admin'
              → no hardcoded UID needed, works for any admin account
```

### Key changes
| Collection | Old | New |
|---|---|---|
| users | anonymous could write | only phone-auth self or admin |
| otpSessions | anyone could write (stored fake OTP) | **collection removed from rules** — no longer needed |
| pendingVerifications | any signed-in user could read | admin read only |
| users.role field | not protected | in touchesAdminFields(), cannot be self-set |

### Deploy command
```bash
firebase deploy --only firestore:rules
```

---

## 5. Storage Rules — What Changed

### Old rules (problems)
- `isAdmin()` used a hardcoded UID array
- No restriction on who is "admin" beyond one hardcoded string

### New rules (fixed)
```
isAdmin() → request.auth.token.firebase.sign_in_provider == 'password'
```
- Admin = anyone who logged in via email/password (your admin account)
- No hardcoded UIDs needed anywhere

### Deploy command
```bash
firebase deploy --only storage
```

---

## 6. Firebase Updates Required (Console, no code changes)

### Step 1 — Enable Phone Auth
Firebase Console → Build → Authentication → Sign-in method → Phone → Enable → Save

### Step 2 — Enable Email/Password Auth
Firebase Console → Build → Authentication → Sign-in method → Email/Password → Enable → Save

### Step 3 — Create Admin User
Firebase Console → Build → Authentication → Users → Add user
- Email: admin@nammaVayal.com (or any email you prefer)
- Password: choose a strong password
After creating → copy the UID shown in the Users table

### Step 4 — Create Admin Firestore Document
Firebase Console → Firestore → users collection → Add document
- Document ID: (paste the UID from Step 3)
- Fields:
  ```
  role:  "admin"   (string)
  name:  "Admin"   (string)
  email: "admin@nammaVayal.com"  (string)
  phone: ""        (string)
  ```

### Step 5 — Deploy Rules
```bash
# From the vayal project folder
firebase deploy --only firestore:rules,storage
```

### Step 6 — Verify FCM
Firebase Console → Project Settings → Cloud Messaging
- Confirm "Server key" exists under the Legacy API section
  (Expo Push API uses this internally — no action needed if it exists)

---

## 7. google-services.json — Do NOT Change

Your current `google-services.json` is correct and complete.
It was downloaded from Firebase Console and contains:
- project_number: 881016543795
- project_id: vayal-33b12
- package_name: com.vayal.app
- api_key: AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4

**Only re-download this file if you:**
- Add a new Android app to the Firebase project
- Regenerate the API key in Google Cloud Console
- Change the package name

**Never manually edit** google-services.json.

---

## 8. Install & Deploy Commands (run in order)

```bash
# 1. Install new packages
npm install

# 2. Deploy updated Firestore + Storage rules
firebase deploy --only firestore:rules,storage

# 3. Clear Metro cache and run dev build
npx expo start --clear

# 4. Production build (after testing)
eas build --platform android --clear-cache
```
