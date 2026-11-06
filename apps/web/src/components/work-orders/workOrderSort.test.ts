import { describe, expect, it } from 'vitest';
import {
  Currency,
  WorkOrderPriority,
  WorkOrderStatus,
  type WorkOrderClientSummary,
} from '@ijac/shared';
import {
  DEFAULT_WORK_ORDER_SORT,
  nextWorkOrderSort,
  parseWorkOrderSort,
  sortWorkOrders,
} from './workOrderSort';

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

describe('sortWorkOrders', () => {
  it('sorts newest created first by default, regardless of the last update', () => {
    const items = [
      order({
        id: 'old',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z',
      }),
      order({ id: 'new', createdAt: '2026-11-05T00:00:00.000Z' }),
      order({ id: 'mid', createdAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(ids(sortWorkOrders(items, DEFAULT_WORK_ORDER_SORT))).toEqual(['new', 'mid', 'old']);
  });

  it('does not change the array it receives', () => {
    const items = [order({ id: 'a', title: 'B' }), order({ id: 'b', title: 'A' })];
    sortWorkOrders(items, { key: 'title', direction: 'asc' });
    expect(ids(items)).toEqual(['a', 'b']);
  });

  it('sorts titles and client names alphabetically, ignoring case and accents', () => {
    const items = [
      order({ id: 'z', title: 'zócalo', clientName: 'Óscar' }),
      order({ id: 'a', title: 'Árbol', clientName: 'beto' }),
      order({ id: 'm', title: 'mesa', clientName: 'Ana' }),
    ];
    expect(ids(sortWorkOrders(items, { key: 'title', direction: 'asc' }))).toEqual(['a', 'm', 'z']);
    expect(ids(sortWorkOrders(items, { key: 'client', direction: 'desc' }))).toEqual([
      'z',
      'a',
      'm',
    ]);
  });

  it('sorts status by workflow and priority by urgency, not alphabetically', () => {
    const items = [
      order({ id: 'done', status: WorkOrderStatus.COMPLETED, priority: WorkOrderPriority.LOW }),
      order({ id: 'open', status: WorkOrderStatus.OPEN, priority: WorkOrderPriority.URGENT }),
      order({ id: 'busy', status: WorkOrderStatus.IN_PROGRESS, priority: WorkOrderPriority.HIGH }),
    ];
    expect(ids(sortWorkOrders(items, { key: 'status', direction: 'asc' }))).toEqual([
      'open',
      'busy',
      'done',
    ]);
    expect(ids(sortWorkOrders(items, { key: 'priority', direction: 'desc' }))).toEqual([
      'open',
      'busy',
      'done',
    ]);
  });

  it('keeps orders without a due date or price last in both directions', () => {
    const items = [
      order({ id: 'none' }),
      order({ id: 'early', dueDate: '2026-01-10', totalPriceMinor: 100, currency: Currency.ARS }),
      order({ id: 'late', dueDate: '2026-12-10', totalPriceMinor: 900, currency: Currency.ARS }),
    ];
    expect(ids(sortWorkOrders(items, { key: 'dueDate', direction: 'asc' }))).toEqual([
      'early',
      'late',
      'none',
    ]);
    expect(ids(sortWorkOrders(items, { key: 'dueDate', direction: 'desc' }))).toEqual([
      'late',
      'early',
      'none',
    ]);
    expect(ids(sortWorkOrders(items, { key: 'totalPrice', direction: 'desc' }))).toEqual([
      'late',
      'early',
      'none',
    ]);
  });

  it('groups prices by currency before comparing amounts', () => {
    const items = [
      order({ id: 'usd', totalPriceMinor: 5_000, currency: Currency.USD }),
      order({ id: 'ars-big', totalPriceMinor: 900_000, currency: Currency.ARS }),
      order({ id: 'ars-small', totalPriceMinor: 1_000, currency: Currency.ARS }),
    ];
    expect(ids(sortWorkOrders(items, { key: 'totalPrice', direction: 'asc' }))).toEqual([
      'ars-small',
      'ars-big',
      'usd',
    ]);
  });

  it('breaks ties with the newest created first', () => {
    const items = [
      order({ id: 'older', title: 'Igual', createdAt: '2026-01-01T00:00:00.000Z' }),
      order({ id: 'newer', title: 'Igual', createdAt: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(ids(sortWorkOrders(items, { key: 'title', direction: 'asc' }))).toEqual([
      'newer',
      'older',
    ]);
  });
});

describe('nextWorkOrderSort', () => {
  it('cycles a column through ascending, descending, and back to the default', () => {
    const first = nextWorkOrderSort(DEFAULT_WORK_ORDER_SORT, 'title');
    expect(first).toEqual({ key: 'title', direction: 'asc' });
    const second = nextWorkOrderSort(first, 'title');
    expect(second).toEqual({ key: 'title', direction: 'desc' });
    expect(nextWorkOrderSort(second, 'title')).toEqual(DEFAULT_WORK_ORDER_SORT);
  });

  it('starts ascending when switching to another column', () => {
    expect(nextWorkOrderSort({ key: 'title', direction: 'desc' }, 'dueDate')).toEqual({
      key: 'dueDate',
      direction: 'asc',
    });
  });
});

describe('parseWorkOrderSort', () => {
  it('accepts a stored sort and rejects anything else', () => {
    expect(parseWorkOrderSort('{"key":"dueDate","direction":"desc"}')).toEqual({
      key: 'dueDate',
      direction: 'desc',
    });
    expect(parseWorkOrderSort('{"key":"secret","direction":"asc"}')).toEqual(
      DEFAULT_WORK_ORDER_SORT,
    );
    expect(parseWorkOrderSort('not json')).toEqual(DEFAULT_WORK_ORDER_SORT);
    expect(parseWorkOrderSort(null)).toEqual(DEFAULT_WORK_ORDER_SORT);
  });
});
