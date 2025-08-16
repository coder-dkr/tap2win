/**
 * Safely converts a value to a number, returning 0 if conversion fails
 */
export const safeNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Safely formats a number to 2 decimal places
 */
export const formatCurrency = (value: unknown): string => {
  return safeNumber(value).toFixed(2);
};

/**
 * Safely formats a number to 2 decimal places with dollar sign
 */
export const formatDollar = (value: unknown): string => {
  return `$${formatCurrency(value)}`;
};
