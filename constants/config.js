// constants/config.js — PRODUCTION
import { TN_DISTRICTS } from './tamilnadu';

export const CONFIG = {
  COMMISSION_PER_HECTARE: 20,
  OTP_EXPIRY_MINUTES:     10,
  MAX_HECTARES_PER_DAY:   5,

  APP_NAME:       'Namma Vayal',
  APP_NAME_TAMIL: 'நம்ம வயல்',

  // Payment — QR scan only
  PAYMENT_RECEIVER: 'NammaVayal',

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
