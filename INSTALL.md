# 🚀 VAYAL — How to Install & Run

## The error you saw means `npm install` was not run yet.
## Follow these exact steps:

---

## Step 1 — Open terminal IN the vayal folder

```
cd "C:\Users\Guna S\Desktop\vayal"
```

## Step 2 — Install all packages (run this FIRST)

```
npm install
```

Wait for it to complete (takes 2-5 minutes, downloads ~300MB).
You should see: `added XXXX packages`

## Step 3 — Start the app

```
npx expo start
```

---

## ⚠️ If you get errors during npm install:

### Error: "npm not found"
→ Install Node.js from https://nodejs.org (choose LTS version)
→ Restart terminal after installing

### Error: "EACCES permission denied"
→ Run terminal as Administrator

### Error: npm stuck or slow
→ Try: `npm install --legacy-peer-deps`

---

## ⚠️ After expo starts:

1. Install **Expo Go** on your Android phone (Play Store)
2. Scan the QR code with your camera
3. App opens on your phone!

## OR use Android Emulator:
1. Install Android Studio
2. Create AVD (Virtual Device)  
3. Press `A` in the terminal

---

## ⚠️ Firebase setup (REQUIRED to login):

Edit `firebase/config.js` with your Firebase credentials.
See `START_HERE.md` for full Firebase setup guide.

---

## Quick summary of ALL commands needed:

```
cd "C:\Users\Guna S\Desktop\vayal"
npm install
npx expo start
```

That's it! 🌾
