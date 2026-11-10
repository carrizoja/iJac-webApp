import { describe, expect, it } from 'vitest';
import type { WorkOrderClientSummary } from '@ijac/shared';
import { Currency, WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';
import { owedByClient } from './clientBalance';

const order = (overrides: Partial<WorkOrderClientSummary>): WorkOrderClientSummary => ({
  id: 'wo',
  title: 'Orden',
  clientId: 'client-1',
  clientName: 'Acme',
  status: WorkOrderStatus.OPEN,
  priority: WorkOrderPriority.NORMAL,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

describe('owedByClient', () => {
  it('adds up what each client still owes, per currency', () => {
    const owed = owedByClient([
      order({ id: 'a', currency: Currency.ARS, totalPriceMinor: 5000, remainingMinor: 3000 }),
      order({ id: 'b', currency: Currency.ARS, totalPriceMinor: 2000, remainingMinor: 2000 }),
      order({ id: 'c', currency: Currency.USD, totalPriceMinor: 100, remainingMinor: 40 }),
      order({
        id: 'd',
        clientId: 'client-2',
        currency: Currency.ARS,
        totalPriceMinor: 900,
        remainingMinor: 900,
      }),
    ]);

    expect(owed.get('client-1')).toEqual([
      { currency: Currency.ARS, minor: 5000 },
      { currency: Currency.USD, minor: 40 },
    ]);
    expect(owed.get('client-2')).toEqual([{ currency: Currency.ARS, minor: 900 }]);
  });

  it('leaves out paid, cancelled and unpriced orders', () => {
    const owed = owedByClient([
      order({ id: 'paid', currency: Currency.ARS, totalPriceMinor: 500, remainingMinor: 0 }),
      order({
        id: 'cancelled',
        status: WorkOrderStatus.CANCELLED,
        currency: Currency.ARS,
        totalPriceMinor: 500,
        remainingMinor: 500,
      }),
      order({ id: 'unpriced' }),
    ]);

    expect(owed.has('client-1')).toBe(false);
  });
});
