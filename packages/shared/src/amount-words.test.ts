import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Currency } from './domain.js';
import { amountToSpanishWords } from './amount-words.js';

/** [major units, expected words for the integer part] — ARS, no cents. */
const WHOLE_AMOUNTS: Array<[number, string]> = [
  [0, 'cero'],
  [1, 'uno'],
  [5, 'cinco'],
  [10, 'diez'],
  [11, 'once'],
  [15, 'quince'],
  [16, 'dieciséis'],
  [20, 'veinte'],
  [21, 'veintiuno'],
  [22, 'veintidós'],
  [23, 'veintitrés'],
  [26, 'veintiséis'],
  [30, 'treinta'],
  [31, 'treinta y uno'],
  [45, 'cuarenta y cinco'],
  [99, 'noventa y nueve'],
  [100, 'cien'],
  [101, 'ciento uno'],
  [111, 'ciento once'],
  [121, 'ciento veintiuno'],
  [200, 'doscientos'],
  [500, 'quinientos'],
  [700, 'setecientos'],
  [900, 'novecientos'],
  [999, 'novecientos noventa y nueve'],
  [1000, 'mil'],
  [1001, 'mil uno'],
  [1100, 'mil cien'],
  [2000, 'dos mil'],
  [21000, 'veintiún mil'],
  [31000, 'treinta y un mil'],
  [101000, 'ciento un mil'],
  [100000, 'cien mil'],
  [150000, 'ciento cincuenta mil'],
  [999999, 'novecientos noventa y nueve mil novecientos noventa y nueve'],
  [1000000, 'un millón'],
  [1000001, 'un millón uno'],
  [1100000, 'un millón cien mil'],
  [2000000, 'dos millones'],
  [2000001, 'dos millones uno'],
  [21000000, 'veintiún millones'],
  [100000000, 'cien millones'],
  [1000000000, 'mil millones'],
  [1000000000000, 'un billón'],
  [2000000000001, 'dos billones uno'],
];

describe('amountToSpanishWords', () => {
  for (const [major, words] of WHOLE_AMOUNTS) {
    it(`writes ${major} ARS as "${words}"`, () => {
      assert.equal(amountToSpanishWords(major * 100, Currency.ARS), `pesos ${words} con 00/100`);
    });
  }

  it('matches the documented examples', () => {
    assert.equal(
      amountToSpanishWords(15000000, Currency.ARS),
      'pesos ciento cincuenta mil con 00/100',
    );
    assert.equal(
      amountToSpanishWords(125050, Currency.USD),
      'dólares estadounidenses mil doscientos cincuenta con 50/100',
    );
    assert.equal(amountToSpanishWords(100000100, Currency.ARS), 'pesos un millón uno con 00/100');
  });

  it('writes cents as a zero-padded fraction over 100', () => {
    assert.equal(amountToSpanishWords(5, Currency.ARS), 'pesos cero con 05/100');
    assert.equal(amountToSpanishWords(99, Currency.ARS), 'pesos cero con 99/100');
    assert.equal(amountToSpanishWords(101, Currency.USD), 'dólares estadounidenses uno con 01/100');
  });

  it('rejects negative, fractional and unsafe amounts', () => {
    for (const bad of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => amountToSpanishWords(bad, Currency.ARS), RangeError, String(bad));
    }
  });

  it('handles the largest safe amount', () => {
    assert.match(amountToSpanishWords(Number.MAX_SAFE_INTEGER, Currency.ARS), /billones/);
  });
});
