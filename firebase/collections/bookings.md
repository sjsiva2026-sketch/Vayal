# bookings collection

Auto-generated document ID

```json
{
  "farmerId":         "firebase_auth_uid",
  "farmerName":       "Selvam",
  "farmerPhone":      "9123456789",   // stored so owner can call farmer
  "ownerId":          "firebase_auth_uid",
  "ownerName":        "Murugan",
  "ownerPhone":       "9876543210",   // stored so farmer can call owner
  "machineId":        "machine_doc_id",
  "machineType":      "Harvester",
  "date":             "2026-03-20",
  "timeSlot":         "10AM-2PM",
  "hectareRequested": 2.5,
  "hectareCompleted": 2.5,
  "commission":       75,             // hectareCompleted * 30
  "status":           "pending | accepted | rejected | ongoing | completed",
  "otp":              "482910",       // 6-digit, farmer gives to owner at field
  "taluk":            "Gingee",
  "createdAt":        "Firestore Timestamp"
}
```

## Status Flow
pending → accepted → ongoing → completed
pending → rejected

## Phone Number Flow
1. Farmer books → farmerPhone + ownerPhone both stored
2. Owner accepts → sees farmerPhone → calls to coordinate
3. Owner enters OTP → calls farmer if OTP unclear
4. Work done → owner calls farmer to confirm hectare
5. Farmer sees ownerPhone in BookingHistory → calls to check status
