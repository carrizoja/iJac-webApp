import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import type { Client } from '@ijac/shared';

const { listClients, listWorkOrders, deleteWorkOrder } = vi.hoisted(() => ({
  listClients: vi.fn(),
  listWorkOrders: vi.fn(),
  deleteWorkOrder: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({
  listClients,
  listWorkOrders,
  deleteWorkOrder,
  ApiRequestError: class ApiRequestError extends Error {},
}));

import { WorkOrderManager } from './WorkOrderManager';

function client(id: string, name: string): Client {
  return {
    id,
    name,
    email: `${id}@example.com`,
    phone: '555',
    workOrderCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

describe('WorkOrderManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkOrders.mockResolvedValue({ items: [] });
  });

  it('offers every client in the client filter, not only the first page', async () => {
    listClients
      .mockResolvedValueOnce({ items: [client('c1', 'Acme')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [client('c2', 'Beta')] });
    render(<WorkOrderManager />);

    await waitFor(() => {
      const select = document.getElementById('clientFilter') as HTMLSelectElement;
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['Todos los clientes', 'Acme', 'Beta']);
    });
    expect(listClients).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'c1' }));
  });
});
