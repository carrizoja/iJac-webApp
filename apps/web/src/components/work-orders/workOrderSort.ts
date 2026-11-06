import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderClientSummary,
} from '@ijac/shared';
import {
  nextTableSort,
  parseTableSort,
  sortRows,
  toTableSort,
  type TableSort,
} from '../../lib/tableSort';

export type { SortDirection } from '../../lib/tableSort';

/** Columns the work-order list can be sorted by. `createdAt` is the default and has no column. */
export const WORK_ORDER_SORT_KEYS = [
  'createdAt',
  'title',
  'client',
  'status',
  'priority',
  'dueDate',
  'totalPrice',
] as const;
export type WorkOrderSortKey = (typeof WORK_ORDER_SORT_KEYS)[number];
export type WorkOrderSort = TableSort<WorkOrderSortKey>;

/** Newest created first. */
export const DEFAULT_WORK_ORDER_SORT: WorkOrderSort = { key: 'createdAt', direction: 'desc' };

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function compareKey(
  a: WorkOrderClientSummary,
  b: WorkOrderClientSummary,
  key: WorkOrderSortKey,
): number | null {
  switch (key) {
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt);
    case 'title':
      return collator.compare(a.title, b.title);
    case 'client':
      return collator.compare(a.clientName, b.clientName);
    // Workflow order (open → cancelled) and urgency order (low → urgent).
    case 'status':
      return WORK_ORDER_STATUSES.indexOf(a.status) - WORK_ORDER_STATUSES.indexOf(b.status);
    case 'priority':
      return WORK_ORDER_PRIORITIES.indexOf(a.priority) - WORK_ORDER_PRIORITIES.indexOf(b.priority);
    case 'dueDate':
      if (!a.dueDate || !b.dueDate) return null;
      return a.dueDate.localeCompare(b.dueDate);
    case 'totalPrice':
      if (a.totalPriceMinor === undefined || b.totalPriceMinor === undefined) return null;
      // Amounts in different currencies are not comparable, so group by currency first.
      return (
        (a.currency ?? '').localeCompare(b.currency ?? '') || a.totalPriceMinor - b.totalPriceMinor
      );
  }
}

function isMissing(item: WorkOrderClientSummary, key: WorkOrderSortKey): boolean {
  if (key === 'dueDate') return !item.dueDate;
  if (key === 'totalPrice') return item.totalPriceMinor === undefined;
  return false;
}

/** Returns a sorted copy. Ties fall back to the newest created first. */
export function sortWorkOrders(
  items: readonly WorkOrderClientSummary[],
  sort: WorkOrderSort,
): WorkOrderClientSummary[] {
  return sortRows(items, sort, { compare: compareKey, isMissing });
}

export function nextWorkOrderSort(current: WorkOrderSort, key: WorkOrderSortKey): WorkOrderSort {
  return nextTableSort(current, key, DEFAULT_WORK_ORDER_SORT);
}

export function toWorkOrderSort(value: unknown): WorkOrderSort {
  return toTableSort(value, WORK_ORDER_SORT_KEYS, DEFAULT_WORK_ORDER_SORT);
}

export function parseWorkOrderSort(raw: string | null): WorkOrderSort {
  return parseTableSort(raw, WORK_ORDER_SORT_KEYS, DEFAULT_WORK_ORDER_SORT);
}
