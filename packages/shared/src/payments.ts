import { PaymentStatus } from './domain.js';

/** Fixed point-of-sale prefix; multiple points of sale are out of scope. */
export const RECEIPT_POINT_OF_SALE = '0001';
export const MAX_RECEIPT_NUMBER = 99_999_999;

/**
 * Derives paid and remaining amounts from a work-order total and its payments.
 * Voided payments are ignored. All values are integer minor currency units.
 */
export function computeBalance(
  totalMinor: number,
  payments: ReadonlyArray<{ amountMinor: number; status: PaymentStatus }>,
): { paidMinor: number; remainingMinor: number } {
  const paidMinor = payments
    .filter((payment) => payment.status === PaymentStatus.ACTIVE)
    .reduce((sum, payment) => sum + payment.amountMinor, 0);
  return { paidMinor, remainingMinor: totalMinor - paidMinor };
}

/** Formats a receipt number as `0001-00000042`. */
export function formatReceiptNumber(receiptNumber: number): string {
  if (
    !Number.isSafeInteger(receiptNumber) ||
    receiptNumber < 1 ||
    receiptNumber > MAX_RECEIPT_NUMBER
  ) {
    throw new RangeError(`Receipt number must be an integer between 1 and ${MAX_RECEIPT_NUMBER}`);
  }
  return `${RECEIPT_POINT_OF_SALE}-${String(receiptNumber).padStart(8, '0')}`;
}
