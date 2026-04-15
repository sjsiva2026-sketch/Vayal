# 📱 VAYAL — What is google-services.json and How to Get It

## 🤔 What is google-services.json?

It is a FILE that Firebase gives you.
It contains your project's identity — telling your Android app
which Firebase project to connect to.

Think of it like a **ID card** for your app.
Without it → app can't talk to Firebase.
With it → app connects to YOUR Firebase project.

---

## 📥 How to Download It (Step by Step with Pictures)

### Step 1 — Go to Firebase Console
Open browser → https://console.firebase.google.com
Click on your project → **vayal-33b12**

### Step 2 — Go to Project Settings
Click the ⚙️ **gear icon** (top left, next to "Project Overview")
Click **"Project settings"**

### Step 3 — Scroll to "Your apps"
Scroll down on the General tab
You will see **"Your apps"** section

### Step 4 — Click Android icon to add Android app
Click the **Android icon** 🤖
Fill in:
  - Android package name: `com.vayal.app`
  - App nickname: `Vayal`
Click **"Register app"**

### Step 5 — Download the file
A button appears: **"Download google-services.json"**
Click it → file downloads to your Downloads folder

### Step 6 — Move the file to vayal folder
1. Open File Explorer
2. Go to Downloads folder
3. Find `google-services.json`
4. CUT it (Ctrl+X)
5. Go to: `C:\Users\Guna S\Desktop\vayal\`
6. PASTE it here (Ctrl+V)
7. When asked "Replace existing file?" → Click YES

---

## ✅ Already Done For You!

Good news: Your google-services.json has been filled in automatically
using your Firebase project details (vayal-33b12).

The file is already at:
  C:\Users\Guna S\Desktop\vayal\google-services.json

BUT — after you register the Android app in Firebase Console,
download the REAL file and replace this one for production builds.

For NOW (Expo Go testing) → it works as-is!

---

## 🚀 Run the App NOW

Open PowerShell/CMD in the vayal folder:

```
npm install
npx expo start
```

Then open Expo Go on your phone and scan the QR code!

---

## 🔑 Login with test numbers:

After adding test numbers in Firebase Console:
- Phone: 9999999999
- OTP: 123456

Firebase Console → Authentication → Sign-in method → Phone
→ Scroll to "Phone numbers for testing" → Add → +91 9999999999 / 123456
