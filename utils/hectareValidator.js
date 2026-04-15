export const validateHectare = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Enter a valid hectare value' };
  if (num > 100) return { valid: false, error: 'Hectare value seems too high' };
  return { valid: true, error: null };
};
