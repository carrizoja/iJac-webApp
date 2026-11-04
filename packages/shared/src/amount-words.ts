import { Currency } from './domain.js';

const CURRENCY_WORDS: Record<Currency, string> = {
  [Currency.ARS]: 'pesos',
  [Currency.USD]: 'dólares estadounidenses',
};

const UNITS = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];

const TENS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];

const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

/**
 * Words for 1..999. When `apocope` is set, a trailing "uno" becomes "un" so it
 * can precede "mil", "millón" or "millones" ("veintiún mil", "treinta y un mil").
 */
function belowThousand(n: number, apocope: boolean): string {
  if (n === 100) return 'cien';
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);
  if (rest > 0) {
    if (rest < 30) {
      parts.push(apocope && rest === 1 ? 'un' : apocope && rest === 21 ? 'veintiún' : UNITS[rest]);
    } else {
      const unit = rest % 10;
      const tens = TENS[Math.floor(rest / 10)];
      parts.push(unit === 0 ? tens : `${tens} y ${apocope && unit === 1 ? 'un' : UNITS[unit]}`);
    }
  }
  return parts.join(' ');
}

/** Words for 1..999,999 ("mil" is never "un mil"). */
function belowMillion(n: number, apocope: boolean): string {
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (thousands === 1) parts.push('mil');
  else if (thousands > 1) parts.push(`${belowThousand(thousands, true)} mil`);
  if (rest > 0) parts.push(belowThousand(rest, apocope));
  return parts.join(' ');
}

/** Words for a non-negative safe integer. */
function integerToWords(n: number): string {
  if (n === 0) return 'cero';
  const billions = Math.floor(n / 1e12);
  const millions = Math.floor((n % 1e12) / 1e6);
  const rest = n % 1e6;
  const parts: string[] = [];
  if (billions === 1) parts.push('un billón');
  else if (billions > 1) parts.push(`${belowMillion(billions, true)} billones`);
  if (millions === 1) parts.push('un millón');
  else if (millions > 1) parts.push(`${belowMillion(millions, true)} millones`);
  if (rest > 0) parts.push(belowMillion(rest, false));
  return parts.join(' ');
}

/**
 * Writes an amount in Spanish for a receipt, e.g. 15000000 ARS →
 * "pesos ciento cincuenta mil con 00/100". The currency noun is always plural
 * and leads the amount, so a single unit reads "pesos uno con 00/100" and the
 * final "uno" is never apocopated.
 */
export function amountToSpanishWords(minor: number, currency: Currency): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError('Amount must be a non-negative safe integer of minor units');
  }
  const whole = Math.floor(minor / 100);
  const cents = String(minor % 100).padStart(2, '0');
  return `${CURRENCY_WORDS[currency]} ${integerToWords(whole)} con ${cents}/100`;
}
