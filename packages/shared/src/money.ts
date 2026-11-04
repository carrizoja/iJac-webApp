import type { Currency } from './domain.js';

/**
 * Formats an integer amount of minor currency units (cents) using the es-AR
 * locale, e.g. `$ 150.000,00` or `US$ 1.250,50`. ICU separates the symbol from
 * the digits with a non-breaking space; it is normalized to a plain space so
 * the output is identical across runtimes.
 */
export function formatMoney(minor: number, currency: Currency): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency })
    .format(minor / 100)
    .replace(/[  ]/g, ' ');
}
