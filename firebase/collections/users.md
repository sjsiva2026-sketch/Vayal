# users collection

Each document ID = Firebase Auth UID

```json
{
  "uid":      "firebase_auth_uid",
  "role":     "farmer | owner | admin",
  "name":     "Rajan Kumar",
  "phone":    "9876543210",        // 10-digit, NO +91 prefix
  "state":    "Tamil Nadu",
  "district": "Villupuram",
  "taluk":    "Gingee",
  "village":  "Kolathur",
  "verified": false,               // owner doc verification by admin
  "isLocked": false,               // locked if commission unpaid
  "createdAt": "Firestore Timestamp"
}
```

## Phone Number Usage
- Stored as 10-digit string (no +91)
- PhoneConnect component prepends +91 for call/WhatsApp
- Embedded in every booking as farmerPhone / ownerPhone
- Displayed on profiles, booking cards, and admin panel
