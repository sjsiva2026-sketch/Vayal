# dailyPayments collection

Document ID = `{ownerId}_{date}`  e.g. `abc123_2026-03-20`

```json
{
  "ownerId":        "firebase_auth_uid",
  "ownerName":      "Murugan",
  "ownerPhone":     "9876543210",
  "date":           "2026-03-20",
  "totalHectare":   6.5,
  "totalCommission": 195,           // totalHectare * 30
  "status":         "paid | unpaid",
  "updatedAt":      "Firestore Timestamp"
}
```

## Commission Rule
₹30 per hectare completed

## Lock Rule
- Every midnight: if status = unpaid → isLocked = true on user doc
- After payment confirmed: isLocked = false

## Admin Override
Admin can force mark paid + unlock from PaymentsList screen
