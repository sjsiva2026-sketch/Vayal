# 🌾 VAYAL — Farmer Machine Connect

> Full-stack React Native marketplace connecting Tamil Nadu farmers with agricultural machine owners.

---

## 📱 What is Vayal?

Vayal (வாயல்) solves a real rural problem: farmers need to rent farm machines (harvesters, tillers, cultivators) but finding available machines nearby is difficult. Machine owners want more bookings but have no platform.

**Vayal connects them directly** with phone-based trust, OTP verification, and automated commission billing.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📞 **Phone Connect** | Every booking stores both phone numbers — instant Call/WhatsApp between farmer & owner |
| 🔐 **OTP Trust Layer** | 6-digit OTP verified at the field before work starts |
| 🌾 **Hectare Billing** | Commission calculated per actual hectare completed |
| 💰 **Auto Lock System** | Owner account locks at midnight if daily commission unpaid |
| 📍 **Taluk-Based Search** | Machines filtered by location — no irrelevant results |
| 🔒 **Account Lock/Unlock** | Instant UPI payment unlocks account |

---

## 📞 Phone Connect System

```
Farmer books
  → Sees owner phone in BookingConfirm
  → Can call/WhatsApp owner from BookingHistory

Owner receives booking
  → Sees farmer phone in BookingRequests
  → Calls farmer before accepting
  → Calls farmer to get OTP at field (WorkStartOTP)
  → Calls farmer during work (WorkInProgress)
  → Calls farmer to confirm hectare (WorkComplete)
```

**PhoneConnect component** (`src/common/components/PhoneConnect.js`):
```jsx
<PhoneConnect
  phone="9876543210"   // 10-digit, no +91
  name="Murugan"
  role="Machine Owner 🚜"
/>
```

---

## 💰 Commission System

```
Commission = Hectare Completed × ₹30
```

- Tracked per job, accumulated in `dailyPayments` Firestore collection  
- Evening reminder at 8 PM  
- Account locked at midnight if unpaid  
- Owner pays via UPI → confirms in app → account unlocked instantly  

---

## 🔐 OTP Work Flow

```
1. Farmer books → 6-digit OTP generated → stored in booking
2. Owner accepts → both farmer and owner see OTP
3. At the field → farmer tells OTP to owner verbally
4. Owner enters OTP in app → work starts ⚙️
5. Work done → owner enters actual hectare → commission calculated
6. Daily Summary → Pay → Confirm → Unlock ✅
```

---

## 🏗️ Architecture

```
App.js (ErrorBoundary + Providers)
├── AuthContext    — Firebase auth state
├── UserContext    — user profile (name, phone, taluk, role)
└── BookingContext — active booking state

AppNavigator
├── AuthNavigator    → Splash → RoleSelect → Login → OTP → ProfileSetup
├── FarmerNavigator  → Home → Location → Category → Machines → Book → Confirm → History
├── OwnerNavigator   → Dashboard → Machines → Bookings → OTP → Work → Summary → Pay
└── AdminNavigator   → Dashboard → Users → Machines → Payments → Reports
```

---

## 🗄️ Firestore Schema

### users
```json
{ "role": "farmer|owner|admin", "phone": "9876543210",
  "name": "Selvam", "district": "Villupuram", "taluk": "Gingee",
  "verified": false, "isLocked": false }
```

### machines
```json
{ "ownerId": "uid", "ownerName": "Murugan", "ownerPhone": "9876543210",
  "type": "Harvester", "price_per_hour": 1500, "taluk": "Gingee", "isActive": true }
```

### bookings
```json
{ "farmerId": "uid", "farmerName": "Selvam", "farmerPhone": "9123456789",
  "ownerId": "uid",  "ownerName": "Murugan",  "ownerPhone": "9876543210",
  "machineType": "Harvester", "date": "2026-03-20", "timeSlot": "10AM-2PM",
  "hectareRequested": 2.5, "hectareCompleted": 2.5, "commission": 75,
  "status": "pending|accepted|rejected|ongoing|completed", "otp": "482910" }
```

### dailyPayments
```json
{ "ownerId": "uid", "ownerName": "Murugan", "ownerPhone": "9876543210",
  "date": "2026-03-20", "totalHectare": 6.5, "totalCommission": 195,
  "status": "paid|unpaid" }
```

---

## 🚀 Quick Start

```bash
npm install
# Edit firebase/config.js with your Firebase credentials
npx expo start
```

See `START_HERE.md` for complete setup guide.

---

## 🎨 Design System

| Token | Color | Use |
|-------|-------|-----|
| primary | `#1C7C54` | Buttons, headers |
| primaryLight | `#4CAF82` | Hover states |
| primaryDark | `#145A3E` | Dark headers |
| secondary | `#F4B400` | CTA, booking actions |
| success | `#22C55E` | Completed |
| error | `#EF4444` | Errors, locked |
| warning | `#F59E0B` | Pending |
| background | `#F9FBFA` | App background |

---

## 📦 Tech Stack

| Package | Use |
|---------|-----|
| Expo SDK 50 | App framework |
| React Native 0.73 | UI |
| Firebase JS v10 | Auth + Firestore + Storage |
| expo-firebase-recaptcha | Phone OTP |
| React Navigation v6 | Navigation |
| expo-linear-gradient | Gradients |
| @react-native-async-storage | Auth persistence |
| date-fns | Date formatting |

---

## 🗺️ Roadmap

- [x] Phone OTP login
- [x] Farmer booking flow
- [x] Owner machine management
- [x] OTP work verification
- [x] Commission billing
- [x] Account lock system
- [x] Phone Connect (Call + WhatsApp)
- [x] Admin panel
- [ ] GPS live tracking
- [ ] Tamil language UI (`constants/tamil.js` ready)
- [ ] Auto PDF invoice
- [ ] Push notifications

---

**Built by GunaSekar 🔥 — VAYAL 🌾 — Ready to launch in Tamil Nadu**
