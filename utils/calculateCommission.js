import { CONFIG } from '../constants/config';

export const calculateCommission = (hectareCompleted) =>
  Number((hectareCompleted * CONFIG.COMMISSION_PER_HECTARE).toFixed(2));

export const calculateDailyCommission = (bookings) => {
  const totalHectare = bookings.reduce((sum, b) => sum + (b.hectareCompleted || 0), 0);
  return { totalHectare, totalCommission: calculateCommission(totalHectare) };
};
