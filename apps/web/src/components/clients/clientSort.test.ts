import { describe, expect, it } from 'vitest';
import type { Client } from '@ijac/shared';
import { DEFAULT_CLIENT_SORT, sortClients } from './clientSort';

function client(overrides: Partial<Client>): Client {
  return {
    id: overrides.id ?? 'c',
    name: 'Cliente',
    email: 'cliente@example.com',
    phone: '341 555-0100',
    workOrderCount: 0,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

const ids = (items: Client[]) => items.map((item) => item.id);

describe('sortClients', () => {
  it('sorts newest created first by default, regardless of the last update', () => {
    const items = [
      client({
        id: 'old',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z',
      }),
      client({ id: 'new', createdAt: '2026-11-05T00:00:00.000Z' }),
    ];
    expect(ids(sortClients(items, DEFAULT_CLIENT_SORT))).toEqual(['new', 'old']);
  });

  it('sorts name, email, and phone alphabetically, ignoring case and accents', () => {
    const items = [
      client({ id: 'o', name: 'Óscar', email: 'zeta@x.com', phone: '2' }),
      client({ id: 'a', name: 'ana', email: 'Beta@x.com', phone: '3' }),
      client({ id: 'b', name: 'Bruno', email: 'alfa@x.com', phone: '1' }),
    ];
    expect(ids(sortClients(items, { key: 'name', direction: 'asc' }))).toEqual(['a', 'b', 'o']);
    expect(ids(sortClients(items, { key: 'email', direction: 'asc' }))).toEqual(['b', 'a', 'o']);
    expect(ids(sortClients(items, { key: 'phone', direction: 'desc' }))).toEqual(['a', 'o', 'b']);
  });

  it('keeps clients without an organization last in both directions', () => {
    const items = [
      client({ id: 'none', organization: '' }),
      client({ id: 'zeta', organization: 'Zeta SA' }),
      client({ id: 'acme', organization: 'Acme' }),
    ];
    expect(ids(sortClients(items, { key: 'organization', direction: 'asc' }))).toEqual([
      'acme',
      'zeta',
      'none',
    ]);
    expect(ids(sortClients(items, { key: 'organization', direction: 'desc' }))).toEqual([
      'zeta',
      'acme',
      'none',
    ]);
  });
});
