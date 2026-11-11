import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Client, WorkOrderClientSummary } from '@ijac/shared';
import { Currency, WorkOrderPriority, WorkOrderStatus, formatMoney } from '@ijac/shared';

const { getClient, listWorkOrders } = vi.hoisted(() => ({
  getClient: vi.fn(),
  listWorkOrders: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({ getClient, listWorkOrders }));

import { ClientDetails } from './ClientDetails';

const acme: Client = {
  id: 'client-1',
  name: 'Acme Inc',
  email: 'acme@example.com',
  phone: '351 555-0100',
  organization: 'Acme Holding',
  notes: 'Atiende de 9 a 13.',
  taxId: '30712345678',
  workOrderCount: 2,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const order = (overrides: Partial<WorkOrderClientSummary>): WorkOrderClientSummary => ({
  id: 'wo',
  title: 'Orden',
  clientId: 'client-1',
  clientName: 'Acme Inc',
  status: WorkOrderStatus.OPEN,
  priority: WorkOrderPriority.NORMAL,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

const owing = order({
  id: 'wo-owing',
  title: 'Cambio de disco',
  totalPriceMinor: 15000000,
  paidMinor: 5000000,
  remainingMinor: 10000000,
  currency: Currency.ARS,
  createdAt: '2026-11-02T00:00:00.000Z',
});
const dollars = order({
  id: 'wo-usd',
  title: 'Licencias',
  totalPriceMinor: 20000,
  paidMinor: 0,
  remainingMinor: 20000,
  currency: Currency.USD,
  createdAt: '2026-11-03T00:00:00.000Z',
});
const done = order({
  id: 'wo-done',
  title: 'Instalación',
  status: WorkOrderStatus.COMPLETED,
  totalPriceMinor: 500000,
  paidMinor: 500000,
  remainingMinor: 0,
  currency: Currency.ARS,
  createdAt: '2026-10-20T00:00:00.000Z',
});

function openPage(search: string) {
  window.history.replaceState(null, '', `/clients/details${search}`);
  render(<ClientDetails />);
}

describe('ClientDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClient.mockResolvedValue(acme);
    listWorkOrders.mockResolvedValue({ items: [owing, dollars, done] });
  });
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('says the client is missing from the link without calling the API', () => {
    openPage('');
    expect(screen.getByRole('alert')).toHaveTextContent('Falta el identificador del cliente.');
    expect(getClient).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Volver a clientes' })).toHaveAttribute(
      'href',
      '/clients',
    );
  });

  it('says plainly when the client does not exist', async () => {
    getClient.mockRejectedValue(new Error('NOT_FOUND'));
    openPage('?id=gone');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos el cliente solicitado.',
    );
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('offers to try again when the client cannot be loaded', async () => {
    getClient.mockRejectedValueOnce(new Error('NETWORK')).mockResolvedValue(acme);
    openPage('?id=client-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el cliente.');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Acme Inc' })).toBeInTheDocument();
  });

  it('shows who the client is and how to reach them', async () => {
    openPage('?id=client-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Acme Inc' })).toBeInTheDocument();
    expect(getClient).toHaveBeenCalledWith('client-1');
    expect(screen.getByRole('link', { name: 'acme@example.com' })).toHaveAttribute(
      'href',
      'mailto:acme@example.com',
    );
    expect(screen.getByRole('link', { name: '351 555-0100' })).toHaveAttribute(
      'href',
      'tel:3515550100',
    );
    expect(screen.getByText('Acme Holding')).toBeInTheDocument();
    expect(screen.getByText('30712345678')).toBeInTheDocument();
    expect(screen.getByText('Atiende de 9 a 13.')).toBeInTheDocument();
  });

  it('shows what the client owes per currency, linking to those orders', async () => {
    openPage('?id=client-1');
    const balance = await screen.findByRole('region', { name: 'Saldo' });
    expect(within(balance).getByText(formatMoney(10000000, Currency.ARS))).toHaveClass(
      'font-heading',
    );
    expect(within(balance).getByText(formatMoney(20000, Currency.USD))).toBeInTheDocument();
    expect(within(balance).getByRole('link', { name: 'Ver órdenes con saldo' })).toHaveAttribute(
      'href',
      '/work-orders?client=client-1&balance=owed',
    );
  });

  it('says when the client owes nothing', async () => {
    listWorkOrders.mockResolvedValue({ items: [done] });
    openPage('?id=client-1');
    const balance = await screen.findByRole('region', { name: 'Saldo' });
    expect(await within(balance).findByText('Sin saldo pendiente.')).toBeInTheDocument();
    expect(within(balance).queryByRole('link')).not.toBeInTheDocument();
  });

  it("lists the client's orders, newest first, each linking to the order", async () => {
    openPage('?id=client-1');
    const orders = await screen.findByRole('region', { name: 'Órdenes' });
    await waitFor(() =>
      expect(listWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' }),
      ),
    );
    const links = within(orders)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/work-orders/details'));
    expect(links.map((link) => link.textContent)).toEqual([
      'Licencias',
      'Cambio de disco',
      'Instalación',
    ]);
    expect(links[1]).toHaveAttribute('href', '/work-orders/details?id=wo-owing');
    const row = links[1].closest('li') as HTMLElement;
    expect(row).toHaveTextContent('Abierta');
    expect(row).toHaveTextContent(
      `${formatMoney(15000000, Currency.ARS)} · Saldo ${formatMoney(10000000, Currency.ARS)}`,
    );
    expect(within(orders).getByRole('link', { name: 'Ver en Órdenes' })).toHaveAttribute(
      'href',
      '/work-orders?client=client-1',
    );
  });

  it('says when the client has no orders yet', async () => {
    listWorkOrders.mockResolvedValue({ items: [] });
    openPage('?id=client-1');
    const orders = await screen.findByRole('region', { name: 'Órdenes' });
    expect(
      await within(orders).findByText('Este cliente todavía no tiene órdenes.'),
    ).toBeInTheDocument();
  });

  it('keeps the contact details when the orders cannot be loaded', async () => {
    listWorkOrders.mockRejectedValue(new Error('NETWORK'));
    openPage('?id=client-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Acme Inc' })).toBeInTheDocument();
    expect(
      await within(screen.getByRole('region', { name: 'Órdenes' })).findByText(
        'No se pudieron cargar las órdenes de este cliente.',
      ),
    ).toBeInTheDocument();
  });
});
