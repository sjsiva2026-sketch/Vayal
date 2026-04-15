import { CONFIG } from '../../constants/config';

export const calculateCommission = (hectareCompleted) =>
  hectareCompleted * CONFIG.COMMISSION_PER_HECTARE;

export const calculateDailyCommission = (completedBookings) => {
  const totalHectare = completedBookings.reduce(
    (sum, b) => sum + (b.hectareCompleted || 0), 0
  );
  return {
    totalHectare,
    totalCommission: totalHectare * CONFIG.COMMISSION_PER_HECTARE,
  };
};
