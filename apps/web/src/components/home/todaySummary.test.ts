import { describe, expect, it } from 'vitest';
import {
  Currency,
  WorkOrderPriority,
  WorkOrderStatus,
  type WorkOrderClientSummary,
} from '@ijac/shared';
import { localDateKey, summarizeToday } from './todaySummary';

function order(overrides: Partial<WorkOrderClientSummary>): WorkOrderClientSummary {
  return {
    id: overrides.id ?? 'wo',
    title: 'Orden',
    clientId: 'c1',
    clientName: 'Cliente',
    status: WorkOrderStatus.OPEN,
    priority: WorkOrderPriority.NORMAL,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

const ids = (items: WorkOrderClientSummary[]) => items.map((item) => item.id);
const TODAY = '2026-11-06';

describe('localDateKey', () => {
  it('formats the local calendar date, not the UTC one', () => {
    expect(localDateKey(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06');
    expect(localDateKey(new Date(2026, 0, 2))).toBe('2026-01-02');
  });
});

describe('summarizeToday', () => {
  it('lists overdue orders oldest first, then the next 7 days, skipping today', () => {
    const items = [
      order({ id: 'late-recent', dueDate: '2026-11-05T00:00:00.000Z' }),
      order({ id: 'late-old', dueDate: '2026-10-01T00:00:00.000Z' }),
      order({ id: 'today', dueDate: '2026-11-06T00:00:00.000Z' }),
      order({ id: 'soon', dueDate: '2026-11-07T00:00:00.000Z' }),
      order({ id: 'edge', dueDate: '2026-11-13T00:00:00.000Z' }),
      order({ id: 'far', dueDate: '2026-11-14T00:00:00.000Z' }),
      order({ id: 'undated' }),
    ];
    const summary = summarizeToday(items, TODAY);
    expect(ids(summary.overdue)).toEqual(['late-old', 'late-recent']);
    expect(ids(summary.upcoming)).toEqual(['soon', 'edge']);
    expect(ids(summary.dueToday)).toEqual(['today']);
  });

  it('leaves completed and cancelled orders out of the attention and agenda lists', () => {
    const items = [
      order({ id: 'done', status: WorkOrderStatus.COMPLETED, dueDate: '2026-11-01' }),
      order({ id: 'gone', status: WorkOrderStatus.CANCELLED, dueDate: '2026-11-06' }),
      order({ id: 'busy', status: WorkOrderStatus.IN_PROGRESS, dueDate: '2026-11-06' }),
    ];
    const summary = summarizeToday(items, TODAY);
    expect(summary.overdue).toEqual([]);
    expect(ids(summary.dueToday)).toEqual(['busy']);
  });

  it('lists orders with a balance, largest first, including completed but not cancelled ones', () => {
    const items = [
      order({ id: 'small', totalPriceMinor: 1000, remainingMinor: 300, currency: Currency.ARS }),
      order({
        id: 'big-done',
        status: WorkOrderStatus.COMPLETED,
        totalPriceMinor: 90000,
        remainingMinor: 50000,
        currency: Currency.ARS,
      }),
      order({
        id: 'cancelled',
        status: WorkOrderStatus.CANCELLED,
        totalPriceMinor: 5000,
        remainingMinor: 5000,
        currency: Currency.ARS,
      }),
      order({ id: 'paid', totalPriceMinor: 1000, remainingMinor: 0, currency: Currency.ARS }),
      order({ id: 'unpriced' }),
    ];
    expect(ids(summarizeToday(items, TODAY).owed)).toEqual(['big-done', 'small']);
  });

  it('totals the amount owed per currency without mixing them', () => {
    const items = [
      order({ id: 'a', totalPriceMinor: 1000, remainingMinor: 400, currency: Currency.ARS }),
      order({ id: 'b', totalPriceMinor: 1000, remainingMinor: 600, currency: Currency.ARS }),
      order({ id: 'c', totalPriceMinor: 500, remainingMinor: 250, currency: Currency.USD }),
    ];
    expect(summarizeToday(items, TODAY).owedTotals).toEqual([
      { currency: Currency.ARS, remainingMinor: 1000 },
      { currency: Currency.USD, remainingMinor: 250 },
    ]);
  });

  it('counts open and in-progress orders', () => {
    const items = [
      order({ id: 'o1' }),
      order({ id: 'o2' }),
      order({ id: 'p1', status: WorkOrderStatus.IN_PROGRESS }),
      order({ id: 'd1', status: WorkOrderStatus.COMPLETED }),
    ];
    const summary = summarizeToday(items, TODAY);
    expect(summary.openCount).toBe(2);
    expect(summary.inProgressCount).toBe(1);
  });
});
