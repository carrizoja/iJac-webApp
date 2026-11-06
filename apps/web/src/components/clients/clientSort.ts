import type { Client } from '@ijac/shared';
import { sortRows, type TableSort } from '../../lib/tableSort';

/** Columns the client list can be sorted by. `createdAt` is the default and has no column. */
export const CLIENT_SORT_KEYS = ['createdAt', 'name', 'email', 'phone', 'organization'] as const;
export type ClientSortKey = (typeof CLIENT_SORT_KEYS)[number];
export type ClientSort = TableSort<ClientSortKey>;

/** Newest created first. */
export const DEFAULT_CLIENT_SORT: ClientSort = { key: 'createdAt', direction: 'desc' };

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function compareKey(a: Client, b: Client, key: ClientSortKey): number | null {
  switch (key) {
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt);
    case 'organization':
      if (!a.organization || !b.organization) return null;
      return collator.compare(a.organization, b.organization);
    default:
      return collator.compare(a[key], b[key]);
  }
}

/** Returns a sorted copy. Clients without an organization stay last; ties go newest first. */
export function sortClients(items: readonly Client[], sort: ClientSort): Client[] {
  return sortRows(items, sort, {
    compare: compareKey,
    isMissing: (item, key) => key === 'organization' && !item.organization,
  });
}
