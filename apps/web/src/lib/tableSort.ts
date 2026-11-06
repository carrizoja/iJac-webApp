export type SortDirection = 'asc' | 'desc';

export interface TableSort<K extends string> {
  key: K;
  direction: SortDirection;
}

export interface SortRowsOptions<T, K extends string> {
  /** Ascending comparison for one key; null when either value is missing. */
  compare: (a: T, b: T, key: K) => number | null;
  /** Rows missing a value for the key stay last in both directions. */
  isMissing?: (row: T, key: K) => boolean;
}

/** Returns a sorted copy. Ties fall back to the newest created first. */
export function sortRows<T extends { createdAt: string }, K extends string>(
  rows: readonly T[],
  sort: TableSort<K>,
  { compare, isMissing = () => false }: SortRowsOptions<T, K>,
): T[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const aMissing = isMissing(a, sort.key);
    const bMissing = isMissing(b, sort.key);
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    const primary = compare(a, b, sort.key);
    if (primary) return sign * primary;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Clicking a column sorts it ascending, then descending, then returns to the default. */
export function nextTableSort<K extends string>(
  current: TableSort<K>,
  key: K,
  defaultSort: TableSort<K>,
): TableSort<K> {
  if (current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return defaultSort;
}

/** Accepts a `{ key, direction }` value, falling back to the default for anything unexpected. */
export function toTableSort<K extends string>(
  value: unknown,
  keys: readonly K[],
  defaultSort: TableSort<K>,
): TableSort<K> {
  const candidate = (value ?? {}) as { key?: unknown; direction?: unknown };
  if (
    keys.includes(candidate.key as K) &&
    (candidate.direction === 'asc' || candidate.direction === 'desc')
  ) {
    return { key: candidate.key as K, direction: candidate.direction };
  }
  return defaultSort;
}

/** Parses a stored sort, falling back to the default for anything unexpected. */
export function parseTableSort<K extends string>(
  raw: string | null,
  keys: readonly K[],
  defaultSort: TableSort<K>,
): TableSort<K> {
  if (!raw) return defaultSort;
  try {
    return toTableSort(JSON.parse(raw), keys, defaultSort);
  } catch {
    return defaultSort;
  }
}

export function readStoredTableSort<K extends string>(
  storageKey: string,
  keys: readonly K[],
  defaultSort: TableSort<K>,
): TableSort<K> {
  try {
    return parseTableSort(window.localStorage.getItem(storageKey), keys, defaultSort);
  } catch {
    return defaultSort;
  }
}

export function storeTableSort<K extends string>(storageKey: string, sort: TableSort<K>): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(sort));
  } catch {
    // Storage can be unavailable (private mode); the sort still works for this visit.
  }
}
