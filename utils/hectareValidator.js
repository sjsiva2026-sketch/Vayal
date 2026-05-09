// utils/hectareValidator.js
export const validateHectare = (value) => {
  const num = parseFloat(value);
  if (!value?.trim())        return { valid: false, error: 'Hectare is required' };
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Enter a valid hectare value' };
  if (num > 50)              return { valid: false, error: 'Hectare value too high (max 50)' };
  return { valid: true, error: null };
};
