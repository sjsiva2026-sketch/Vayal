export const validateHectare = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Enter a valid hectare value' };
  return { valid: true, error: null };
};
