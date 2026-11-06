import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  Currency,
  WorkOrderPriority,
  WorkOrderStatus,
  type WorkOrderClientSummary,
} from '@ijac/shared';

const { listWorkOrders, getCalendarConnectionStatus } = vi.hoisted(() => ({
  listWorkOrders: vi.fn(),
  getCalendarConnectionStatus: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({ listWorkOrders }));
vi.mock('../../lib/calendar', () => ({ getCalendarConnectionStatus }));

import { TodayDashboard } from './TodayDashboard';

function order(overrides: Partial<WorkOrderClientSummary>): WorkOrderClientSummary {
  return {
    id: overrides.id ?? 'wo',
    title: 'Orden',
    clientId: 'c1',
    clientName: 'Acme',
    status: WorkOrderStatus.OPEN,
    priority: WorkOrderPriority.NORMAL,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

const section = (name: string) => screen.getByRole('region', { name });

describe('TodayDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0));
    listWorkOrders.mockResolvedValue({ items: [] });
    getCalendarConnectionStatus.mockResolvedValue({ connected: true, status: 'connected' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows today's date", async () => {
    render(<TodayDashboard />);
    expect(await screen.findByText(/6 de noviembre de 2026/)).toBeInTheDocument();
  });

  it('lists overdue orders marked as overdue, then the coming days, each linking to the order', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        order({ id: 'soon', title: 'Instalar red', dueDate: '2026-11-09T00:00:00.000Z' }),
        order({
          id: 'late',
          title: 'Reparar servidor',
          dueDate: '2026-11-02T00:00:00.000Z',
          priority: WorkOrderPriority.URGENT,
        }),
      ],
    });
    render(<TodayDashboard />);

    const attention = section('Atención');
    const late = await within(attention).findByRole('link', { name: 'Reparar servidor' });
    expect(late).toHaveAttribute('href', '/work-orders/details?id=late');
    const lateRow = late.closest('li') as HTMLElement;
    expect(within(lateRow).getByText('Vencida')).toBeInTheDocument();
    expect(within(lateRow).getByText('Urgente')).toBeInTheDocument();
    expect(within(lateRow).getByText('Acme')).toBeInTheDocument();

    const soonRow = within(attention)
      .getByRole('link', { name: 'Instalar red' })
      .closest('li') as HTMLElement;
    expect(within(soonRow).queryByText('Vencida')).not.toBeInTheDocument();
    const links = within(attention).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Reparar servidor', 'Instalar red']);
  });

  it('lists money owed largest first with a total per currency, linking to the payments', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        order({
          id: 'a',
          title: 'Chico',
          totalPriceMinor: 100000,
          paidMinor: 50000,
          remainingMinor: 50000,
          currency: Currency.ARS,
        }),
        order({
          id: 'b',
          title: 'Grande',
          status: WorkOrderStatus.COMPLETED,
          totalPriceMinor: 900000,
          paidMinor: 0,
          remainingMinor: 900000,
          currency: Currency.ARS,
        }),
        order({
          id: 'c',
          title: 'Dólares',
          totalPriceMinor: 2000,
          paidMinor: 1000,
          remainingMinor: 1000,
          currency: Currency.USD,
        }),
      ],
    });
    render(<TodayDashboard />);

    const owed = section('Cobros pendientes');
    const big = await within(owed).findByRole('link', { name: 'Grande' });
    expect(big).toHaveAttribute('href', '/work-orders/details?id=b#payments');
    expect(
      within(owed)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Grande', 'Chico', 'Dólares']);
    const totals = within(owed).getByTestId('owed-totals');
    expect(totals).toHaveTextContent('$ 9.500,00');
    expect(totals).toHaveTextContent('US$ 10,00');
    expect(within(big.closest('li') as HTMLElement).getByText('$ 9.000,00')).toBeInTheDocument();
  });

  it("shows today's orders and offers to connect the calendar when it is not connected", async () => {
    getCalendarConnectionStatus.mockResolvedValue({ connected: false, status: 'disconnected' });
    listWorkOrders.mockResolvedValue({
      items: [order({ id: 't', title: 'Visita hoy', dueDate: '2026-11-06T00:00:00.000Z' })],
    });
    render(<TodayDashboard />);

    const agenda = section('Agenda de hoy');
    expect(await within(agenda).findByRole('link', { name: 'Visita hoy' })).toBeInTheDocument();
    expect(
      await within(agenda).findByRole('link', { name: 'Conectá Google Calendar' }),
    ).toHaveAttribute('href', '/calendar');
    expect(within(section('Atención')).queryByText('Visita hoy')).not.toBeInTheDocument();
  });

  it('links each open-work count to the filtered order list', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        order({ id: '1' }),
        order({ id: '2' }),
        order({ id: '3', status: WorkOrderStatus.IN_PROGRESS }),
      ],
    });
    render(<TodayDashboard />);

    const open = section('Trabajo abierto');
    const openLink = await within(open).findByRole('link', { name: '2 Abiertas' });
    expect(openLink).toHaveAttribute('href', '/work-orders?status=open');
    expect(within(open).getByRole('link', { name: '1 En progreso' })).toHaveAttribute(
      'href',
      '/work-orders?status=in-progress',
    );
  });

  it('says plainly when there is nothing to show', async () => {
    render(<TodayDashboard />);
    expect(
      await within(section('Atención')).findByText('No hay órdenes vencidas ni próximas a vencer'),
    ).toBeInTheDocument();
    expect(
      within(section('Cobros pendientes')).getByText('No hay saldos pendientes'),
    ).toBeInTheDocument();
    expect(
      within(section('Agenda de hoy')).getByText('No hay órdenes para hoy'),
    ).toBeInTheDocument();
  });

  it('shows the load error in each order block while the calendar line still works', async () => {
    listWorkOrders.mockRejectedValue(new Error('NETWORK_ERROR'));
    getCalendarConnectionStatus.mockResolvedValue({ connected: false, status: 'disconnected' });
    render(<TodayDashboard />);

    expect(
      await within(section('Atención')).findByText('No se pudieron cargar las órdenes.'),
    ).toBeInTheDocument();
    expect(
      within(section('Cobros pendientes')).getByText('No se pudieron cargar las órdenes.'),
    ).toBeInTheDocument();
    expect(
      await within(section('Agenda de hoy')).findByRole('link', {
        name: 'Conectá Google Calendar',
      }),
    ).toBeInTheDocument();
  });
});
