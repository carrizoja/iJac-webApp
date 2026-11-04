import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidCuit, normalizeTaxId } from './tax-id.js';

describe('normalizeTaxId', () => {
  const cases: Array<[string, string]> = [
    ['20-12345678-6', '20123456786'],
    ['20.12345678.6', '20123456786'],
    [' 20 12345678 6 ', '20123456786'],
    ['20123456786', '20123456786'],
    ['', ''],
  ];

  for (const [input, expected] of cases) {
    it(`normalizes ${JSON.stringify(input)}`, () => {
      assert.equal(normalizeTaxId(input), expected);
    });
  }
});

describe('isValidCuit', () => {
  const valid = ['20123456786', '30500010912', '20000000001', '20123456794'];
  const invalid: Array<[string, string]> = [
    ['20123456787', 'wrong check digit'],
    ['2012345678', 'too short'],
    ['201234567860', 'too long'],
    ['2012345678a', 'non-digit'],
    ['', 'empty'],
    ['20-12345678-6', 'not normalized'],
  ];

  for (const cuit of valid) {
    it(`accepts ${cuit}`, () => {
      assert.equal(isValidCuit(cuit), true);
    });
  }

  for (const [cuit, reason] of invalid) {
    it(`rejects ${JSON.stringify(cuit)} (${reason})`, () => {
      assert.equal(isValidCuit(cuit), false);
    });
  }

  it('maps a computed check digit of 11 to 0', () => {
    assert.equal(isValidCuit('27200000000'), true);
    assert.equal(isValidCuit('27200000001'), false);
  });

  it('never accepts a body whose computed check digit is 10', () => {
    for (let digit = 0; digit <= 9; digit += 1) {
      assert.equal(isValidCuit(`2000000001${digit}`), false);
    }
  });
});
