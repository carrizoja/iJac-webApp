import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  Currency,
  WorkOrderPriority,
  WorkOrderStatus,
  type WorkOrderClientSummary,
} from '@ijac/shared';

const mocks = vi.hoisted(() => ({
  listWorkOrders: vi.fn(),
  getCurrentMember: vi.fn(),
  recordPayment: vi.fn(),
  getOrganizationProfile: vi.fn(),
  getCalendarConnectionStatus: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(
      readonly code: string,
      readonly fieldErrors?: Record<string, string>,
    ) {
      super(code);
    }
  },
}));
const {
  listWorkOrders,
  getCurrentMember,
  recordPayment,
  getOrganizationProfile,
  getCalendarConnectionStatus,
  ApiRequestError,
} = mocks;

vi.mock('../../lib/resources', () => ({
  listWorkOrders: mocks.listWorkOrders,
  getCurrentMember: mocks.getCurrentMember,
  recordPayment: mocks.recordPayment,
  getOrganizationProfile: mocks.getOrganizationProfile,
  ApiRequestError: mocks.ApiRequestError,
}));
vi.mock('../../lib/calendar', () => ({
  getCalendarConnectionStatus: mocks.getCalendarConnectionStatus,
}));

import { TodayDashboard } from './TodayDashboard';
import { makePayment } from '../payments/fixtures';

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

/** The submit button names the amount once one is typed: "Registrar $ 250,00". */
const SUBMIT_PAYMENT = /^Registrar( \$|$)/;

describe('TodayDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0));
    getOrganizationProfile.mockResolvedValue({ configured: true, canEdit: true, profile: {} });
    listWorkOrders.mockResolvedValue({ items: [] });
    getCurrentMember.mockResolvedValue({ role: 'admin' });
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
    // The 'Vencidas' group heading already says so; the date itself turns red.
    expect(within(lateRow).queryByText('Vencida')).not.toBeInTheDocument();
    expect(within(lateRow).getByText(/2 de noviembre/)).toHaveClass('text-destructive-text');
    expect(within(lateRow).getByText('Urgente')).toBeInTheDocument();
    expect(within(lateRow).getByText('Acme')).toBeInTheDocument();

    const soonRow = within(attention)
      .getByRole('link', { name: 'Instalar red' })
      .closest('li') as HTMLElement;
    expect(within(soonRow).getByText(/9 de noviembre/)).not.toHaveClass('text-destructive-text');
    const links = within(attention)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/work-orders/'));
    expect(links.map((link) => link.textContent)).toEqual(['Reparar servidor', 'Instalar red']);
    expect(within(attention).getByTestId('overdue-count')).toHaveTextContent('1 vencida');
  });

  it('leads the attention block with the overdue count, as large as the money owed', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        order({ id: 'a', title: 'Uno', dueDate: '2026-11-02T00:00:00.000Z' }),
        order({ id: 'b', title: 'Dos', dueDate: '2026-11-03T00:00:00.000Z' }),
      ],
    });
    render(<TodayDashboard />);

    const count = await within(section('Atención')).findByTestId('overdue-count');
    expect(count).toHaveTextContent('2 vencidas');
    expect(within(count).getByText('2')).toHaveClass('text-3xl', 'text-destructive-text');
  });

  it('shows no overdue count when nothing is overdue', async () => {
    listWorkOrders.mockResolvedValue({
      items: [order({ id: 'soon', title: 'Instalar red', dueDate: '2026-11-09T00:00:00.000Z' })],
    });
    render(<TodayDashboard />);

    await within(section('Atención')).findByRole('link', { name: 'Instalar red' });
    expect(screen.queryByTestId('overdue-count')).not.toBeInTheDocument();
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
      within(within(owed).getByRole('list'))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Grande', 'Chico', 'Dólares']);
    const totals = within(owed).getByTestId('owed-totals');
    expect(within(totals).getByText('Total adeudado')).toBeInTheDocument();
    // Each currency's total is the block's main figure, never added to the other.
    expect(within(totals).getByText('$ 9.500,00')).toHaveClass('text-3xl');
    expect(within(totals).getByText('US$ 10,00')).toHaveClass('text-3xl');
    expect(within(big.closest('li') as HTMLElement).getByText('$ 9.000,00')).toBeInTheDocument();
  });

  it('links the money owed to the order list filtered to balances due', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        order({
          id: 'a',
          title: 'Chico',
          totalPriceMinor: 100000,
          paidMinor: 0,
          remainingMinor: 100000,
          currency: Currency.ARS,
        }),
      ],
    });
    render(<TodayDashboard />);

    const owed = section('Cobros pendientes');
    const link = await within(owed).findByRole('link', { name: 'Ver órdenes con saldo' });
    expect(link).toHaveAttribute('href', '/work-orders?balance=owed');
  });

  it("lists today's orders in the attention block between overdue and the coming days", async () => {
    getCalendarConnectionStatus.mockResolvedValue({ connected: false, status: 'disconnected' });
    listWorkOrders.mockResolvedValue({
      items: [
        order({ id: 'soon', title: 'Instalar red', dueDate: '2026-11-09T00:00:00.000Z' }),
        order({ id: 't', title: 'Visita hoy', dueDate: '2026-11-06T00:00:00.000Z' }),
        order({ id: 'late', title: 'Reparar servidor', dueDate: '2026-11-02T00:00:00.000Z' }),
      ],
    });
    render(<TodayDashboard />);

    const attention = section('Atención');
    const today = await within(attention).findByRole('link', { name: 'Visita hoy' });
    expect(today).toHaveAttribute('href', '/work-orders/details?id=t');
    expect(
      within(attention)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Vencidas', 'Vencen hoy', 'Próximos 7 días']);
    expect(
      within(attention)
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('/work-orders/'))
        .map((link) => link.textContent),
    ).toEqual(['Reparar servidor', 'Visita hoy', 'Instalar red']);
    expect(within(today.closest('li') as HTMLElement).getByText(/6 de noviembre/)).not.toHaveClass(
      'text-destructive-text',
    );
    expect(
      await within(attention).findByRole('link', { name: 'Conectá Google Calendar' }),
    ).toHaveAttribute('href', '/calendar');
    expect(screen.queryByRole('region', { name: 'Agenda de hoy' })).not.toBeInTheDocument();
  });

  it('shows urgent orders without a due date in the attention block, after today', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        order({ id: 'soon', title: 'Instalar red', dueDate: '2026-11-09T00:00:00.000Z' }),
        order({ id: 'u', title: 'Servidor caído', priority: WorkOrderPriority.URGENT }),
        order({ id: 't', title: 'Visita hoy', dueDate: '2026-11-06T00:00:00.000Z' }),
      ],
    });
    render(<TodayDashboard />);

    const attention = section('Atención');
    const urgent = await within(attention).findByRole('link', { name: 'Servidor caído' });
    expect(urgent).toHaveAttribute('href', '/work-orders/details?id=u');
    expect(
      within(attention)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Vencen hoy', 'Urgentes sin fecha', 'Próximos 7 días']);
    // The row has no date to show, so it does not say "Vence".
    expect(urgent.closest('li')).not.toHaveTextContent('Vence');
  });

  it('does not call the attention block empty when only an urgent undated order needs it', async () => {
    listWorkOrders.mockResolvedValue({
      items: [order({ id: 'u', title: 'Servidor caído', priority: WorkOrderPriority.URGENT })],
    });
    render(<TodayDashboard />);

    const attention = section('Atención');
    expect(await within(attention).findByRole('link', { name: 'Servidor caído' })).toBeVisible();
    expect(within(attention).getByRole('heading', { name: 'Urgentes sin fecha' })).toBeVisible();
    expect(
      within(attention).queryByText(
        'No hay órdenes vencidas, para hoy, urgentes sin fecha ni para los próximos 7 días',
      ),
    ).not.toBeInTheDocument();
  });

  it('links to the calendar from the attention block when it is connected', async () => {
    render(<TodayDashboard />);
    expect(
      await within(section('Atención')).findByRole('link', { name: 'Ver calendario' }),
    ).toHaveAttribute('href', '/calendar');
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
      await within(section('Atención')).findByText(
        'No hay órdenes vencidas, para hoy, urgentes sin fecha ni para los próximos 7 días',
      ),
    ).toBeInTheDocument();
    expect(
      within(section('Cobros pendientes')).getByText('No hay saldos pendientes'),
    ).toBeInTheDocument();
  });

  it('shows one load error with a retry, while the calendar line still works', async () => {
    listWorkOrders.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
    getCalendarConnectionStatus.mockResolvedValue({ connected: false, status: 'disconnected' });
    render(<TodayDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar las órdenes.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(within(section('Atención')).getByText('No disponible')).toBeInTheDocument();
    expect(within(section('Cobros pendientes')).getByText('No disponible')).toBeInTheDocument();
    expect(
      await within(section('Atención')).findByRole('link', {
        name: 'Conectá Google Calendar',
      }),
    ).toBeInTheDocument();

    listWorkOrders.mockResolvedValue({
      items: [
        order({ id: 'late', title: 'Reparar servidor', dueDate: '2026-11-02T00:00:00.000Z' }),
      ],
    });
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(
      await within(section('Atención')).findByRole('link', { name: 'Reparar servidor' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(listWorkOrders).toHaveBeenCalledTimes(2);
  });

  describe('recording a payment from Cobros pendientes', () => {
    const owedOrders = () => ({
      items: [
        order({
          id: 'b',
          title: 'Grande',
          totalPriceMinor: 900000,
          paidMinor: 0,
          remainingMinor: 900000,
          currency: Currency.ARS,
        }),
        order({
          id: 'a',
          title: 'Chico',
          totalPriceMinor: 100000,
          paidMinor: 50000,
          remainingMinor: 50000,
          currency: Currency.ARS,
        }),
      ],
    });

    it('records a payment from the row, prefilled with what is owed, without leaving Hoy', async () => {
      listWorkOrders.mockResolvedValue(owedOrders());
      recordPayment.mockResolvedValue(
        makePayment({ workOrderId: 'a', amountMinor: 50000, receiptNumber: 42 }),
      );
      render(<TodayDashboard />);
      const owed = section('Cobros pendientes');

      fireEvent.click(await within(owed).findByRole('button', { name: 'Registrar pago de Chico' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByLabelText(/Importe/)).toHaveValue('500,00');
      const summary = within(within(dialog).getByTestId('record-payment-summary'));
      expect(summary.getByText('Chico')).toBeInTheDocument();
      expect(summary.getByText('Acme')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: SUBMIT_PAYMENT }));

      expect(await screen.findByText('Pago registrado · Recibo 0001-00000042')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ver recibo' })).toBeInTheDocument();
      expect(recordPayment).toHaveBeenCalledWith(
        'a',
        expect.objectContaining({ amountMinor: 50000 }),
      );
      // Paid in full: the row leaves the list and the total drops by the amount paid.
      expect(within(owed).queryByRole('link', { name: 'Chico' })).not.toBeInTheDocument();
      expect(
        within(within(owed).getByTestId('owed-totals')).getByText('$ 9.000,00'),
      ).toBeInTheDocument();
      expect(listWorkOrders).toHaveBeenCalledTimes(1);
    });

    it('keeps a partly paid order in the list with what is still owed', async () => {
      listWorkOrders.mockResolvedValue(owedOrders());
      recordPayment.mockResolvedValue(makePayment({ workOrderId: 'b', amountMinor: 100000 }));
      render(<TodayDashboard />);
      const owed = section('Cobros pendientes');

      fireEvent.click(
        await within(owed).findByRole('button', { name: 'Registrar pago de Grande' }),
      );
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText(/Importe/), { target: { value: '1.000,00' } });
      fireEvent.click(within(dialog).getByRole('button', { name: SUBMIT_PAYMENT }));

      await screen.findByText(/Pago registrado/);
      const row = within(owed).getByRole('link', { name: 'Grande' }).closest('li') as HTMLElement;
      expect(within(row).getByText('$ 8.000,00')).toBeInTheDocument();
    });

    it('keeps the form and refreshes the balance when the payment is refused', async () => {
      // Someone else recorded part of it meanwhile, so 500,00 is now more than is owed.
      listWorkOrders.mockResolvedValueOnce(owedOrders()).mockResolvedValueOnce({
        items: owedOrders().items.map((item) =>
          item.id === 'a' ? { ...item, paidMinor: 80000, remainingMinor: 20000 } : item,
        ),
      });
      recordPayment.mockRejectedValue(
        new ApiRequestError('PAYMENT_EXCEEDS_BALANCE', { amountMinor: 'too much' }),
      );
      render(<TodayDashboard />);
      const owed = section('Cobros pendientes');

      fireEvent.click(await within(owed).findByRole('button', { name: 'Registrar pago de Chico' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: SUBMIT_PAYMENT }));

      expect(
        await within(dialog).findByText('El importe supera el saldo pendiente ($ 200,00)'),
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/Importe/)).toHaveValue('500,00');
      const row = within(owed).getByRole('link', { name: 'Chico' }).closest('li') as HTMLElement;
      expect(within(row).getByText('$ 200,00')).toBeInTheDocument();
      expect(screen.queryByText(/Pago registrado/)).not.toBeInTheDocument();
      expect(listWorkOrders).toHaveBeenCalledTimes(2);
    });

    it('offers it only to admins', async () => {
      listWorkOrders.mockResolvedValue(owedOrders());
      getCurrentMember.mockResolvedValue({ role: 'member' });
      render(<TodayDashboard />);

      await within(section('Cobros pendientes')).findByRole('link', { name: 'Grande' });
      expect(screen.queryByRole('button', { name: /Registrar pago/ })).not.toBeInTheDocument();
    });

    it('does not offer it when the role cannot be read', async () => {
      listWorkOrders.mockResolvedValue(owedOrders());
      getCurrentMember.mockRejectedValue(new Error('network'));
      render(<TodayDashboard />);

      await within(section('Cobros pendientes')).findByRole('link', { name: 'Grande' });
      expect(screen.queryByRole('button', { name: /Registrar pago/ })).not.toBeInTheDocument();
    });
  });
});
