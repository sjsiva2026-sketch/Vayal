# machines collection

Auto-generated document ID

```json
{
  "ownerId":        "firebase_auth_uid",
  "ownerName":      "Murugan",
  "ownerPhone":     "9876543210",   // stored for farmer to call directly
  "type":           "Harvester | Rotator | Cultivator | Straw Chopper",
  "price_per_hour": 1500,
  "taluk":          "Gingee",
  "isActive":       true,
  "createdAt":      "Firestore Timestamp"
}
```

## Indexes Required
- taluk + type + isActive  (for farmer machine search)
- ownerId                  (for owner machine list)
