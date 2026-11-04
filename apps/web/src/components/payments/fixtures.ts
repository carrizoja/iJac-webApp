import { Currency, PaymentConcept, PaymentMethod, PaymentStatus, type Payment } from '@ijac/shared';

/** Builds a payment fixture for component tests. */
export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    workOrderId: 'wo-1',
    receiptNumber: 42,
    amountMinor: 15000000,
    currency: Currency.ARS,
    paymentDate: '2026-08-05',
    method: PaymentMethod.BANK_TRANSFER,
    status: PaymentStatus.ACTIVE,
    concept: PaymentConcept.ADVANCE,
    issuer: {
      businessName: 'iJac IT Solutions',
      cuit: '20123456786',
      address: 'Calle Falsa 123, Córdoba',
      phone: '+54 351 555-0100',
    },
    client: { name: 'Acme Corp', taxId: '30712345678' },
    workOrderTitle: 'Revisión remota',
    recordedBy: { uid: 'u1', email: 'admin@ijac.test', displayName: 'Admin' },
    createdAt: '2026-08-05T12:00:00.000Z',
    ...overrides,
  };
}
