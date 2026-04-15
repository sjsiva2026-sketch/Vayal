import { TN_DISTRICTS } from './tamilnadu';

export const CONFIG = {
  COMMISSION_PER_HECTARE: 20,
  OTP_EXPIRY_MINUTES: 10,

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
