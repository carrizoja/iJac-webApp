import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderClientSummary,
} from '@ijac/shared';

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
export type SortDirection = 'asc' | 'desc';

export interface WorkOrderSort {
  key: WorkOrderSortKey;
  direction: SortDirection;
}

/** Newest created first. */
export const DEFAULT_WORK_ORDER_SORT: WorkOrderSort = { key: 'createdAt', direction: 'desc' };

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/**
 * Compares two values for one key, ascending. Returns null when either value
 * is missing, so missing values can stay last in both directions.
 */
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
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const aMissing = isMissing(a, sort.key);
    const bMissing = isMissing(b, sort.key);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    const primary = compareKey(a, b, sort.key);
    if (primary) return sign * primary;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Clicking a column sorts it ascending, then descending, then returns to the default. */
export function nextWorkOrderSort(current: WorkOrderSort, key: WorkOrderSortKey): WorkOrderSort {
  if (current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return DEFAULT_WORK_ORDER_SORT;
}

/** Accepts a `{ key, direction }` value, falling back to the default for anything unexpected. */
export function toWorkOrderSort(value: unknown): WorkOrderSort {
  const candidate = (value ?? {}) as Partial<Record<keyof WorkOrderSort, unknown>>;
  if (
    WORK_ORDER_SORT_KEYS.includes(candidate.key as WorkOrderSortKey) &&
    (candidate.direction === 'asc' || candidate.direction === 'desc')
  ) {
    return { key: candidate.key as WorkOrderSortKey, direction: candidate.direction };
  }
  return DEFAULT_WORK_ORDER_SORT;
}

/** Reads a stored sort, falling back to the default for anything unexpected. */
export function parseWorkOrderSort(raw: string | null): WorkOrderSort {
  if (!raw) return DEFAULT_WORK_ORDER_SORT;
  try {
    return toWorkOrderSort(JSON.parse(raw));
  } catch {
    return DEFAULT_WORK_ORDER_SORT;
  }
}
