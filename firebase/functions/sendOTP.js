import { CONFIG } from '../../constants/config';

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Verify OTP match
 */
export const verifyOTP = (inputOTP, storedOTP) =>
  inputOTP.trim() === storedOTP.trim();
