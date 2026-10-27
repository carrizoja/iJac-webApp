const CUIT_LENGTH = 11;
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Strips hyphens, dots, and whitespace from a tax identifier. */
export function normalizeTaxId(value: string): string {
  return value.replace(/[-.\s]/g, '');
}

/**
 * Validates an already normalized CUIT (11 digits) with the mod-11 check digit.
 * A computed check digit of 11 maps to 0; 10 has no valid digit, so it is invalid.
 */
export function isValidCuit(digits: string): boolean {
  if (!new RegExp(`^\\d{${CUIT_LENGTH}}$`).test(digits)) {
    return false;
  }

  const sum = CUIT_WEIGHTS.reduce(
    (total, weight, index) => total + weight * Number(digits[index]),
    0,
  );
  const computed = 11 - (sum % 11);
  if (computed === 10) {
    return false;
  }

  return (computed === 11 ? 0 : computed) === Number(digits[CUIT_LENGTH - 1]);
}
