const GROUPED = /^\d{1,3}(?:\.\d{3})+(?:,(\d{1,2}))?$/;
const PLAIN = /^\d+(?:,(\d{1,2}))?$/;

/**
 * Parses an es-AR money string into integer minor units (cents).
 * Dots are thousands separators and the comma is the decimal mark, so
 * `150.000,50` becomes 15000050. Returns null for blank, negative, malformed
 * input, more than two decimals, or amounts beyond the safe integer range.
 */
export function parseMoneyInput(value: string): number | null {
  const text = value.trim();
  const match = GROUPED.exec(text) ?? PLAIN.exec(text);
  if (!match) return null;
  const whole = text.split(',')[0].replace(/\./g, '');
  const cents = (match[1] ?? '').padEnd(2, '0');
  const minor = Number(whole) * 100 + Number(cents);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Renders minor units as an editable es-AR string such as `150.000,50`. */
export function formatMoneyInput(minor: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
