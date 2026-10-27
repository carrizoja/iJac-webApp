import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CURRENCIES, Currency } from './domain.js';

describe('Currency', () => {
  it('exposes the supported ISO currency codes', () => {
    assert.deepEqual([...CURRENCIES], ['ARS', 'USD']);
    assert.equal(Currency.ARS, 'ARS');
    assert.equal(Currency.USD, 'USD');
  });
});
