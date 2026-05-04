// utils/validators.js
// Central validation for all user inputs — production-ready

// Phone: 10-digit Indian mobile number
export const validatePhone = (phone) => {
  const cleaned = phone?.replace(/\D/g, '') ?? '';
  if (!cleaned) return { valid: false, error: 'Phone number is required' };
  if (cleaned.length !== 10) return { valid: false, error: 'Enter a valid 10-digit phone number' };
  if (!/^[6-9]/.test(cleaned)) return { valid: false, error: 'Number must start with 6, 7, 8, or 9' };
  return { valid: true, error: null };
};

// OTP: exactly 6 digits
export const validateOTP = (otp) => {
  const cleaned = otp?.trim() ?? '';
  if (!cleaned) return { valid: false, error: 'OTP is required' };
  if (!/^\d{6}$/.test(cleaned)) return { valid: false, error: 'Enter the 6-digit OTP' };
  return { valid: true, error: null };
};

// Name: 2–60 chars, letters + spaces only
export const validateName = (name) => {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return { valid: false, error: 'Name is required' };
  if (trimmed.length < 2) return { valid: false, error: 'Name is too short' };
  if (trimmed.length > 60) return { valid: false, error: 'Name is too long (max 60 chars)' };
  return { valid: true, error: null };
};

// Hectare: positive number ≤ 50
export const validateHectare = (value) => {
  const num = parseFloat(value);
  if (!value?.trim()) return { valid: false, error: 'Hectare is required' };
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Enter a valid hectare value' };
  if (num > 50) return { valid: false, error: 'Hectare value seems too high (max 50)' };
  return { valid: true, error: null };
};

// Price: positive integer ≤ 50,000
export const validatePrice = (value) => {
  const num = parseFloat(value);
  if (!value?.trim()) return { valid: false, error: 'Price is required' };
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Enter a valid price' };
  if (num > 50000) return { valid: false, error: 'Price seems too high (max ₹50,000/hr)' };
  return { valid: true, error: null };
};

// Vehicle number: Indian format TN59AB1234
export const validateVehicleNumber = (num) => {
  const cleaned = num?.trim().toUpperCase().replace(/\s/g, '') ?? '';
  if (!cleaned) return { valid: false, error: 'Vehicle number is required' };
  if (cleaned.length < 6) return { valid: false, error: 'Vehicle number too short' };
  if (cleaned.length > 12) return { valid: false, error: 'Vehicle number too long' };
  return { valid: true, error: null };
};

// Transaction ID: 8–30 alphanumeric
export const validateTransactionId = (txnId) => {
  const cleaned = txnId?.trim().toUpperCase() ?? '';
  if (!cleaned) return { valid: false, error: 'Transaction ID is required' };
  if (cleaned.length < 6) return { valid: false, error: 'Transaction ID seems too short' };
  if (cleaned.length > 30) return { valid: false, error: 'Transaction ID seems too long' };
  if (!/^[A-Z0-9]+$/i.test(cleaned)) return { valid: false, error: 'Only letters and numbers allowed' };
  return { valid: true, error: null };
};

// Date: YYYY-MM-DD format, not in the past
export const validateBookingDate = (dateStr) => {
  if (!dateStr?.trim()) return { valid: false, error: 'Date is required' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { valid: false, error: 'Invalid date format (use YYYY-MM-DD)' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d < today) return { valid: false, error: 'Booking date cannot be in the past' };
  return { valid: true, error: null };
};
