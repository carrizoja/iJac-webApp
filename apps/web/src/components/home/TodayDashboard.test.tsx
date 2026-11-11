import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  Currency,
  PaymentMethod,
  formatMoney,
  WorkOrderPriority,
  WorkOrderStatus,
  type WorkOrderClientSummary,
} from '@ijac/shared';

const mocks = vi.hoisted(() => ({
  listWorkOrders: vi.fn(),
  listPaymentsByDate: vi.fn(),
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
  listPaymentsByDate,
  getCurrentMember,
  recordPayment,
  getOrganizationProfile,
  getCalendarConnectionStatus,
  ApiRequestError,
} = mocks;

vi.mock('../../lib/resources', () => ({
  listWorkOrders: mocks.listWorkOrders,
  listPaymentsByDate: mocks.listPaymentsByDate,
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
    listPaymentsByDate.mockResolvedValue({ date: '2026-11-06', items: [], totals: [] });
    getCurrentMember.mockResolvedValue({ role: 'admin' });
    getCalendarConnectionStatus.mockResolvedValue({ connected: true, status: 'connected' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a new order or a new client from Hoy', async () => {
    render(<TodayDashboard />);
    expect(await screen.findByRole('link', { name: /^Nueva orden/ })).toHaveAttribute(
      'href',
      '/work-orders?new=1',
    );
    expect(screen.getByRole('link', { name: /^Nuevo cliente/ })).toHaveAttribute(
      'href',
      '/clients?new=1',
    );
  });

  it('shows the key for each Hoy button while shortcuts are on, and not once they are off', async () => {
    const { unmount } = render(<TodayDashboard />);
    const order = await screen.findByRole('link', { name: /^Nueva orden/ });
    expect(order).toHaveAttribute('aria-keyshortcuts', 'N');
    expect(within(order).getByText('N').tagName).toBe('KBD');
    expect(screen.getByRole('link', { name: /^Nuevo cliente/ })).toHaveAttribute(
      'aria-keyshortcuts',
      'C',
    );
    unmount();

    window.localStorage.setItem('ijac.shortcuts', 'off');
    render(<TodayDashboard />);
    const quiet = await screen.findByRole('link', { name: /^Nueva orden/ });
    expect(quiet).not.toHaveAttribute('aria-keyshortcuts');
    expect(within(quiet).queryByText('N')).not.toBeInTheDocument();
    window.localStorage.clear();
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

  it('links the overdue count to the overdue orders', async () => {
    listWorkOrders.mockResolvedValue({
      items: [order({ id: 'a', title: 'Uno', dueDate: '2026-11-02T00:00:00.000Z' })],
    });
    render(<TodayDashboard />);

    const link = await within(section('Atención')).findByRole('link', { name: '1 vencida' });
    expect(link).toHaveAttribute('href', '/work-orders?due=overdue');
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

  describe('long lists', () => {
    const overdueOrders = Array.from({ length: 7 }, (_, i) =>
      order({
        id: `late-${i}`,
        title: `Vencida ${i + 1}`,
        dueDate: `2026-10-${String(10 + i).padStart(2, '0')}T00:00:00.000Z`,
      }),
    );
    const orderLinks = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('a[href^="/work-orders/details"]')).map(
        (link) => link.textContent,
      );

    it('shows five orders per group, and the rest on Ver todas', async () => {
      listWorkOrders.mockResolvedValue({ items: overdueOrders });
      render(<TodayDashboard />);

      const attention = section('Atención');
      await within(attention).findByRole('link', { name: 'Vencida 1' });
      expect(orderLinks(attention)).toEqual([
        'Vencida 1',
        'Vencida 2',
        'Vencida 3',
        'Vencida 4',
        'Vencida 5',
      ]);
      const more = within(attention).getByRole('button', { name: 'Ver todas (7)' });
      expect(more).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(more);
      expect(orderLinks(attention)).toHaveLength(7);
      expect(more).toHaveAttribute('aria-expanded', 'true');
      expect(more).toHaveTextContent('Ver menos');

      fireEvent.click(more);
      expect(orderLinks(attention)).toHaveLength(5);
    });

    it('offers no Ver todas when a group fits', async () => {
      listWorkOrders.mockResolvedValue({ items: overdueOrders.slice(0, 5) });
      render(<TodayDashboard />);

      const attention = section('Atención');
      await within(attention).findByRole('link', { name: 'Vencida 5' });
      expect(within(attention).queryByRole('button', { name: /^Ver todas/ })).toBeNull();
    });

    it('shows the five largest balances, with the total and a link to all of them', async () => {
      listWorkOrders.mockResolvedValue({
        // Loaded smallest first, so the five shown must come from sorting by balance.
        items: Array.from({ length: 7 }, (_, i) =>
          order({
            id: `owed-${i}`,
            title: `Saldo ${7 - i}`,
            totalPriceMinor: (i + 1) * 10000,
            paidMinor: 0,
            remainingMinor: (i + 1) * 10000,
            currency: Currency.ARS,
          }),
        ),
      });
      render(<TodayDashboard />);

      const owed = section('Cobros pendientes');
      await within(owed).findByRole('link', { name: 'Saldo 1' });
      expect(orderLinks(owed)).toEqual(['Saldo 1', 'Saldo 2', 'Saldo 3', 'Saldo 4', 'Saldo 5']);
      // The total still counts every order, not only the five shown.
      expect(within(owed).getByTestId('owed-totals')).toHaveTextContent('$ 2.800,00');
      expect(within(within(owed).getByTestId('owed-totals')).getByText('$ 2.800,00')).toHaveClass(
        'font-heading',
        'tabular-nums',
      );
      expect(
        within(owed).getByRole('link', { name: 'Ver las 7 órdenes con saldo' }),
      ).toHaveAttribute('href', '/work-orders?balance=owed');
    });
  });

  it('puts Cobros pendientes beside the open-work counts, not under the attention list', async () => {
    render(<TodayDashboard />);
    const owed = await screen.findByRole('region', { name: 'Cobros pendientes' });
    const open = screen.getByRole('region', { name: 'Trabajo abierto' });
    const attention = screen.getByRole('region', { name: 'Atención' });
    const column = (el: HTMLElement) => el.closest('[data-testid^="home-column"]');
    expect(column(owed)).toBe(column(open));
    expect(column(attention)).not.toBe(column(owed));
    // Money comes first in that column, so it shows on phones right after Atención.
    expect(owed.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

  describe('missing organization profile', () => {
    it('warns admins in Cobros pendientes, linking to Settings', async () => {
      getOrganizationProfile.mockResolvedValue({ configured: false, canEdit: true, profile: null });
      render(<TodayDashboard />);

      const owed = section('Cobros pendientes');
      const warning = await within(owed).findByRole('status');
      expect(warning).toHaveTextContent(
        'Completá los datos de la organización antes de registrar pagos.',
      );
      expect(within(warning).getByRole('link', { name: 'Ir a Configuración' })).toHaveAttribute(
        'href',
        '/settings',
      );
      // The warning comes first in the block, before the balances it affects.
      expect(owed.querySelector('h2')?.nextElementSibling).toBe(warning);
    });

    it('shows no warning once the profile is complete', async () => {
      render(<TodayDashboard />);

      await within(section('Cobros pendientes')).findByText('No hay saldos pendientes');
      expect(getOrganizationProfile).toHaveBeenCalled();
      expect(screen.queryByText(/Completá los datos de la organización/)).not.toBeInTheDocument();
    });

    it('does not warn members, who cannot record payments', async () => {
      getOrganizationProfile.mockResolvedValue({
        configured: false,
        canEdit: false,
        profile: null,
      });
      getCurrentMember.mockResolvedValue({ role: 'member' });
      render(<TodayDashboard />);

      await within(section('Cobros pendientes')).findByText('No hay saldos pendientes');
      expect(screen.queryByText(/Completá los datos de la organización/)).not.toBeInTheDocument();
    });

    it('shows no warning when the profile cannot be read', async () => {
      getOrganizationProfile.mockRejectedValue(new Error('network'));
      render(<TodayDashboard />);

      await within(section('Cobros pendientes')).findByText('No hay saldos pendientes');
      expect(screen.queryByText(/Completá los datos de la organización/)).not.toBeInTheDocument();
    });
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

  describe('Cobrado hoy', () => {
    it('asks for the payments dated today and shows what came in, per currency', async () => {
      listPaymentsByDate.mockResolvedValue({
        date: '2026-11-06',
        items: [
          makePayment({
            id: 'p1',
            workOrderId: 'wo-a',
            workOrderTitle: 'Cambio de disco',
            receiptNumber: 42,
            amountMinor: 2500000,
            method: PaymentMethod.CASH,
            paymentDate: '2026-11-06',
          }),
          makePayment({
            id: 'p2',
            workOrderId: 'wo-b',
            workOrderTitle: 'Soporte mensual',
            receiptNumber: 43,
            amountMinor: 12000,
            currency: Currency.USD,
            paymentDate: '2026-11-06',
          }),
        ],
        totals: [
          { currency: Currency.ARS, amountMinor: 2500000 },
          { currency: Currency.USD, amountMinor: 12000 },
        ],
      });
      render(<TodayDashboard />);

      const collected = section('Cobrado hoy');
      const link = await within(collected).findByRole('link', { name: 'Cambio de disco' });
      expect(listPaymentsByDate).toHaveBeenCalledWith('2026-11-06');
      expect(link).toHaveAttribute('href', '/work-orders/details?id=wo-a#payments');
      const totals = within(collected).getByTestId('collected-totals');
      expect(within(totals).getByText('$ 25.000,00')).toHaveClass('font-heading');
      expect(within(totals).getByText(formatMoney(12000, Currency.USD))).toBeInTheDocument();
      const row = link.closest('li') as HTMLElement;
      expect(row).toHaveTextContent('Recibo 0001-00000042');
      expect(row).toHaveTextContent('Acme Corp');
      expect(row).toHaveTextContent('Efectivo');
      expect(row).toHaveTextContent('$ 25.000,00');
    });

    it('says plainly when nothing has come in today', async () => {
      render(<TodayDashboard />);
      expect(
        await within(section('Cobrado hoy')).findByText('Todavía no hay cobros con fecha de hoy.'),
      ).toBeInTheDocument();
    });

    it("says so when today's payments cannot be loaded, and the rest of Hoy still works", async () => {
      listPaymentsByDate.mockRejectedValue(new Error('offline'));
      listWorkOrders.mockResolvedValue({
        items: [order({ id: 'late', title: 'Atrasada', dueDate: '2026-11-02T00:00:00.000Z' })],
      });
      render(<TodayDashboard />);

      expect(
        await within(section('Cobrado hoy')).findByText('No se pudo cargar lo cobrado hoy.'),
      ).toBeInTheDocument();
      expect(
        await within(section('Atención')).findByRole('link', { name: 'Atrasada' }),
      ).toBeInTheDocument();
    });
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

    it('adds a payment dated today to Cobrado hoy without a reload, but not one dated another day', async () => {
      listWorkOrders.mockResolvedValue(owedOrders());
      recordPayment.mockResolvedValueOnce(
        makePayment({
          workOrderId: 'a',
          workOrderTitle: 'Chico',
          amountMinor: 50000,
          paymentDate: '2026-11-06',
        }),
      );
      const chico = makePayment({
        workOrderId: 'a',
        workOrderTitle: 'Chico',
        amountMinor: 50000,
        paymentDate: '2026-11-06',
      });
      listPaymentsByDate
        .mockResolvedValueOnce({ date: '2026-11-06', items: [], totals: [] })
        .mockResolvedValue({
          date: '2026-11-06',
          items: [chico],
          totals: [{ currency: Currency.ARS, amountMinor: 50000 }],
        });
      render(<TodayDashboard />);
      const owed = section('Cobros pendientes');
      const collected = section('Cobrado hoy');
      await within(collected).findByText('Todavía no hay cobros con fecha de hoy.');

      fireEvent.click(await within(owed).findByRole('button', { name: 'Registrar pago de Chico' }));
      fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: SUBMIT_PAYMENT }),
      );

      expect(await within(collected).findByRole('link', { name: 'Chico' })).toBeInTheDocument();
      expect(
        within(within(collected).getByTestId('collected-totals')).getByText('$ 500,00'),
      ).toBeInTheDocument();
      // The block asks the server again, so its totals are the server's, not a local copy.
      expect(listPaymentsByDate).toHaveBeenCalledTimes(2);

      recordPayment.mockResolvedValueOnce(
        makePayment({
          id: 'old',
          workOrderId: 'b',
          workOrderTitle: 'Grande',
          amountMinor: 1000,
          paymentDate: '2026-11-01',
        }),
      );
      fireEvent.click(
        await within(owed).findByRole('button', { name: 'Registrar pago de Grande' }),
      );
      fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: SUBMIT_PAYMENT }),
      );
      await waitFor(() => expect(recordPayment).toHaveBeenCalledTimes(2));
      expect(within(collected).queryByRole('link', { name: 'Grande' })).not.toBeInTheDocument();
      // A payment dated another day does not ask again.
      expect(listPaymentsByDate).toHaveBeenCalledTimes(2);
    });

    it('keeps a payment recorded before Cobrado hoy has loaded, whichever answer arrives last', async () => {
      listWorkOrders.mockResolvedValue(owedOrders());
      const chico = makePayment({
        workOrderId: 'a',
        workOrderTitle: 'Chico',
        amountMinor: 50000,
        paymentDate: '2026-11-06',
      });
      recordPayment.mockResolvedValueOnce(chico);
      // The first load is slow and was read before the payment existed.
      let resolveFirst!: (value: unknown) => void;
      listPaymentsByDate
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValue({
          date: '2026-11-06',
          items: [chico],
          totals: [{ currency: Currency.ARS, amountMinor: 50000 }],
        });
      render(<TodayDashboard />);
      const owed = section('Cobros pendientes');
      const collected = section('Cobrado hoy');

      fireEvent.click(await within(owed).findByRole('button', { name: 'Registrar pago de Chico' }));
      fireEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: SUBMIT_PAYMENT }),
      );
      expect(await within(collected).findByRole('link', { name: 'Chico' })).toBeInTheDocument();

      // The stale first answer arrives late and must not take the payment away.
      resolveFirst({ date: '2026-11-06', items: [], totals: [] });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(within(collected).getByRole('link', { name: 'Chico' })).toBeInTheDocument();
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
