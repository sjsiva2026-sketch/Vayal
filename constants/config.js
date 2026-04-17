import { TN_DISTRICTS } from './tamilnadu';

export const CONFIG = {
  COMMISSION_PER_HECTARE: 20,
  OTP_EXPIRY_MINUTES: 10,

  // Maximum hectares that can be booked / worked per day (farmer OR machine side)
  MAX_HECTARES_PER_DAY: 5,

  // ─── Vayal App UPI — linked to your current account ──────────────────────
  // Replace this with your actual UPI ID after linking your current account.
  // Example formats:
  //   yourname@okaxis   (Google Pay — Axis Bank)
  //   yourname@okicici  (Google Pay — ICICI Bank)
  //   yourname@ybl      (PhonePe)
  //   yourname@paytm    (Paytm)
  //   yourname@oksbi    (Google Pay — SBI)
  //
  // HOW TO GET YOUR UPI ID:
  //   1. Open GPay / PhonePe / Paytm
  //   2. Add your CURRENT ACCOUNT bank details
  //   3. Set UPI PIN
  //   4. Find your UPI ID in Profile section
  //   5. Paste it here ↓
  VAYAL_UPI_ID:   'vayal@okaxis',       // ← Replace with your real UPI ID
  VAYAL_UPI_NAME: 'VAYAL AGRI SERVICES', // Shown in UPI payment screen

  BOOKING_STATUSES: {
    PENDING:   'pending',
    ACCEPTED:  'accepted',
    REJECTED:  'rejected',
    ONGOING:   'ongoing',
    COMPLETED: 'completed',
  },

  PAYMENT_STATUSES: {
    PAID:   'paid',
    UNPAID: 'unpaid',
  },

  TIME_SLOTS: [
    '6AM–10AM',
    '10AM–2PM',
    '2PM–6PM',
    '6PM–10PM',
  ],

  TAMIL_NADU_DISTRICTS: TN_DISTRICTS,
};
