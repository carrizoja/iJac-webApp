import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PaymentStatus } from './domain.js';
import { computeBalance, formatReceiptNumber } from './payments.js';

const payment = (amountMinor: number, status = PaymentStatus.ACTIVE) => ({ amountMinor, status });

describe('computeBalance', () => {
  it('reports zero paid with no payments', () => {
    assert.deepEqual(computeBalance(10000000, []), { paidMinor: 0, remainingMinor: 10000000 });
  });

  it('sums active payments only', () => {
    const balance = computeBalance(10000000, [
      payment(3000000),
      payment(2000000),
      payment(1000000, PaymentStatus.VOIDED),
    ]);
    assert.deepEqual(balance, { paidMinor: 5000000, remainingMinor: 5000000 });
  });

  it('reaches zero remaining when fully paid', () => {
    assert.deepEqual(computeBalance(500, [payment(200), payment(300)]), {
      paidMinor: 500,
      remainingMinor: 0,
    });
  });

  it('ignores voided payments entirely', () => {
    assert.deepEqual(computeBalance(500, [payment(500, PaymentStatus.VOIDED)]), {
      paidMinor: 0,
      remainingMinor: 500,
    });
  });
});

describe('formatReceiptNumber', () => {
  it('pads to the point-of-sale prefix and 8 digits', () => {
    assert.equal(formatReceiptNumber(1), '0001-00000001');
    assert.equal(formatReceiptNumber(42), '0001-00000042');
    assert.equal(formatReceiptNumber(99999999), '0001-99999999');
  });

  it('rejects zero, negative, fractional, unsafe and over-range numbers', () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity, 100000000, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => formatReceiptNumber(bad), RangeError, String(bad));
    }
  });
});
