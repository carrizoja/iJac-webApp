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

  it('lists pending urgent orders without a due date, waiting longest first', () => {
    const items = [
      order({
        id: 'urgent-new',
        priority: WorkOrderPriority.URGENT,
        createdAt: '2026-11-05T10:00:00.000Z',
      }),
      order({
        id: 'urgent-old',
        priority: WorkOrderPriority.URGENT,
        status: WorkOrderStatus.IN_PROGRESS,
        createdAt: '2026-10-20T10:00:00.000Z',
      }),
      // Dated urgent work already sits in its date group.
      order({
        id: 'urgent-dated',
        priority: WorkOrderPriority.URGENT,
        dueDate: '2026-11-05T00:00:00.000Z',
      }),
      order({ id: 'high-undated', priority: WorkOrderPriority.HIGH }),
      order({
        id: 'urgent-done',
        priority: WorkOrderPriority.URGENT,
        status: WorkOrderStatus.COMPLETED,
      }),
      order({
        id: 'urgent-cancelled',
        priority: WorkOrderPriority.URGENT,
        status: WorkOrderStatus.CANCELLED,
      }),
    ];

    const summary = summarizeToday(items, TODAY);

    expect(ids(summary.urgentUndated)).toEqual(['urgent-old', 'urgent-new']);
    expect(ids(summary.overdue)).toEqual(['urgent-dated']);
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

  it('groups the money owed by currency, largest balance first within each', () => {
    // Minor units of different currencies are not comparable, so they are never sorted together.
    const items = [
      order({ id: 'usd-small', totalPriceMinor: 300, remainingMinor: 300, currency: Currency.USD }),
      order({
        id: 'ars-big',
        totalPriceMinor: 900000,
        remainingMinor: 900000,
        currency: Currency.ARS,
      }),
      order({ id: 'usd-big', totalPriceMinor: 1000, remainingMinor: 1000, currency: Currency.USD }),
      order({ id: 'ars-small', totalPriceMinor: 500, remainingMinor: 500, currency: Currency.ARS }),
    ];
    expect(ids(summarizeToday(items, TODAY).owed)).toEqual([
      'ars-big',
      'ars-small',
      'usd-big',
      'usd-small',
    ]);
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
