// firebase/functions/sendOTP.js
// ── DEPRECATED — DO NOT USE ──────────────────────────────────────────────
// This file previously contained a fake in-memory OTP system:
//   generateOTP() → Math.random()
//   verifyOTP(inputOTP, storedOTP) → string comparison
//
// It caused the crash: "Cannot read property 'verify' of undefined"
// because callers were calling verifyOTP(otp, undefined) and
// undefined.trim() threw a TypeError.
//
// Real OTP is now handled entirely by Firebase Phone Auth:
//   sendOTP()   → firebase/auth.js → signInWithPhoneNumber()
//   verifyOTP() → firebase/auth.js → confirmationResult.confirm()
//
// This file is kept empty to avoid import errors in any remaining references.
// ─────────────────────────────────────────────────────────────────────────

export {};
