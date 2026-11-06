import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  nextTableSort,
  parseTableSort,
  readStoredTableSort,
  sortRows,
  storeTableSort,
  toTableSort,
  type TableSort,
} from './tableSort';

type Key = 'createdAt' | 'name' | 'city';
const KEYS = ['createdAt', 'name', 'city'] as const;
const DEFAULT: TableSort<Key> = { key: 'createdAt', direction: 'desc' };

interface Row {
  id: string;
  name: string;
  city?: string;
  createdAt: string;
}

const rows: Row[] = [
  { id: 'a', name: 'Bea', city: 'Rosario', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'b', name: 'Ana', createdAt: '2026-03-01T00:00:00.000Z' },
  { id: 'c', name: 'Ana', city: 'Córdoba', createdAt: '2026-02-01T00:00:00.000Z' },
];
const options = {
  compare: (a: Row, b: Row, key: Key) => {
    if (key === 'name') return a.name.localeCompare(b.name);
    if (key === 'city') return a.city && b.city ? a.city.localeCompare(b.city) : null;
    return a.createdAt.localeCompare(b.createdAt);
  },
  isMissing: (row: Row, key: Key) => key === 'city' && !row.city,
};
const ids = (items: Row[]) => items.map((row) => row.id);

describe('sortRows', () => {
  it('sorts by the key, breaks ties with the newest created first, and keeps the input intact', () => {
    expect(ids(sortRows(rows, { key: 'name', direction: 'asc' }, options))).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(ids(sortRows(rows, DEFAULT, options))).toEqual(['b', 'c', 'a']);
    expect(ids(rows)).toEqual(['a', 'b', 'c']);
  });

  it('keeps missing values last in both directions', () => {
    expect(ids(sortRows(rows, { key: 'city', direction: 'asc' }, options))).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(ids(sortRows(rows, { key: 'city', direction: 'desc' }, options))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });
});

describe('nextTableSort', () => {
  it('cycles a column through ascending, descending, and back to the default', () => {
    const first = nextTableSort(DEFAULT, 'name', DEFAULT);
    expect(first).toEqual({ key: 'name', direction: 'asc' });
    const second = nextTableSort(first, 'name', DEFAULT);
    expect(second).toEqual({ key: 'name', direction: 'desc' });
    expect(nextTableSort(second, 'name', DEFAULT)).toEqual(DEFAULT);
    expect(nextTableSort(second, 'city', DEFAULT)).toEqual({ key: 'city', direction: 'asc' });
  });
});

describe('toTableSort and parseTableSort', () => {
  it('accept known keys and directions and fall back to the default otherwise', () => {
    expect(toTableSort({ key: 'city', direction: 'desc' }, KEYS, DEFAULT)).toEqual({
      key: 'city',
      direction: 'desc',
    });
    expect(toTableSort({ key: 'secret', direction: 'asc' }, KEYS, DEFAULT)).toEqual(DEFAULT);
    expect(toTableSort(null, KEYS, DEFAULT)).toEqual(DEFAULT);
    expect(parseTableSort('{"key":"name","direction":"asc"}', KEYS, DEFAULT)).toEqual({
      key: 'name',
      direction: 'asc',
    });
    expect(parseTableSort('not json', KEYS, DEFAULT)).toEqual(DEFAULT);
    expect(parseTableSort(null, KEYS, DEFAULT)).toEqual(DEFAULT);
  });
});

describe('stored sort', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('round-trips through localStorage', () => {
    storeTableSort('test.sort', { key: 'name', direction: 'desc' });
    expect(readStoredTableSort('test.sort', KEYS, DEFAULT)).toEqual({
      key: 'name',
      direction: 'desc',
    });
  });

  it('falls back to the default when storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storeTableSort('test.sort', { key: 'name', direction: 'asc' })).not.toThrow();
    expect(readStoredTableSort('test.sort', KEYS, DEFAULT)).toEqual(DEFAULT);
  });
});
