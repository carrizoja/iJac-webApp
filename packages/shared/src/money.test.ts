import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Currency } from './domain.js';
import { formatMoney } from './money.js';

describe('formatMoney', () => {
  it('formats ARS minor units with es-AR separators', () => {
    assert.equal(formatMoney(15000000, Currency.ARS), '$ 150.000,00');
  });

  it('formats USD minor units with the US$ prefix', () => {
    assert.equal(formatMoney(125050, Currency.USD), 'US$ 1.250,50');
  });

  it('formats zero and sub-unit amounts', () => {
    assert.equal(formatMoney(0, Currency.ARS), '$ 0,00');
    assert.equal(formatMoney(5, Currency.USD), 'US$ 0,05');
  });

  it('formats very large amounts without precision loss', () => {
    assert.equal(formatMoney(123456789012, Currency.ARS), '$ 1.234.567.890,12');
  });

  it('never emits non-breaking spaces', () => {
    assert.doesNotMatch(formatMoney(15000000, Currency.ARS), / | /);
    assert.doesNotMatch(formatMoney(125050, Currency.USD), / | /);
  });
});
