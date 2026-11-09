import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';

const { listWorkOrders, deleteWorkOrder, ApiRequestError } = vi.hoisted(() => ({
  listWorkOrders: vi.fn(),
  deleteWorkOrder: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
}));

vi.mock('../../lib/resources', () => ({ listWorkOrders, deleteWorkOrder, ApiRequestError }));

import { WorkOrderList } from './WorkOrderList';

const sampleClient: Client = {
  id: 'client-1',
  name: 'Acme Corp',
  email: 'acme@example.com',
  phone: '555-0100',
  organization: 'Acme',
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workOrderCount: 1,
};

const sampleWorkOrder: WorkOrderClientSummary = {
  id: 'wo-1',
  title: 'Reparación de Servidor',
  clientId: 'client-1',
  clientName: 'Acme Corp',
  status: WorkOrderStatus.OPEN,
  priority: WorkOrderPriority.HIGH,
  dueDate: '2026-08-15T00:00:00.000Z',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('WorkOrderList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // The list writes its filters to the URL; each test starts from a clean one.
    window.history.replaceState(null, '', '/');
    listWorkOrders.mockResolvedValue({ items: [] });
    deleteWorkOrder.mockResolvedValue(undefined);
  });

  it('renders loading state initially', () => {
    listWorkOrders.mockReturnValue(new Promise(() => {}));
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByTestId('work-orders-loading-state')).toBeInTheDocument();
    expect(screen.getByText('Cargando órdenes...')).toBeInTheDocument();
  });

  it('renders empty state and create trigger after loading', async () => {
    const onCreate = vi.fn();
    render(<WorkOrderList clients={[sampleClient]} onCreate={onCreate} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('No hay órdenes de trabajo')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Nueva orden' }));

    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('applies status, priority, and client filters', async () => {
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    await waitFor(() =>
      expect(listWorkOrders).toHaveBeenCalledWith({
        status: undefined,
        priority: undefined,
        clientId: undefined,
      }),
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'open' },
    });

    await waitFor(() =>
      expect(listWorkOrders).toHaveBeenLastCalledWith({
        status: 'open',
        priority: undefined,
        clientId: undefined,
      }),
    );
  });

  describe('filters from the link', () => {
    afterEach(() => window.history.replaceState(null, '', '/'));

    it('starts with the status and priority given in the URL', async () => {
      window.history.replaceState(null, '', '/work-orders?status=in-progress&priority=urgent');
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

      await waitFor(() =>
        expect(listWorkOrders).toHaveBeenCalledWith({
          status: 'in-progress',
          priority: 'urgent',
          clientId: undefined,
        }),
      );
      expect(listWorkOrders).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveValue(
        'in-progress',
      );
      expect(screen.getByRole('combobox', { name: 'Filtrar por prioridad' })).toHaveValue('urgent');
    });

    it('ignores unknown filter values in the URL', async () => {
      window.history.replaceState(null, '', '/work-orders?status=secret&priority=');
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

      await waitFor(() =>
        expect(listWorkOrders).toHaveBeenCalledWith({
          status: undefined,
          priority: undefined,
          clientId: undefined,
        }),
      );
      expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveValue('');
    });
  });

  it('names each filter for assistive technology', async () => {
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('No hay órdenes de trabajo')).toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por prioridad' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrar por cliente' })).toBeInTheDocument();
  });

  it('keeps the filters and the current list on screen while a filter reloads', async () => {
    listWorkOrders.mockResolvedValueOnce({ items: [sampleWorkOrder] });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Reparación de Servidor')).toBeInTheDocument());

    listWorkOrders.mockReturnValue(new Promise(() => {}));
    const statusFilter = screen.getByRole('combobox', { name: 'Filtrar por estado' });
    statusFilter.focus();
    fireEvent.change(statusFilter, { target: { value: 'open' } });

    await waitFor(() => expect(screen.getByText('Actualizando órdenes...')).toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBe(statusFilter);
    expect(statusFilter).toHaveFocus();
    expect(screen.getByText('Reparación de Servidor')).toBeInTheDocument();
    expect(screen.queryByTestId('work-orders-loading-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('work-order-results')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders table mode by default and supports card switching, details, and actions', async () => {
    const onEdit = vi.fn();
    listWorkOrders.mockResolvedValue({ items: [sampleWorkOrder] });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={onEdit} />);

    await waitFor(() => expect(screen.getByText('Reparación de Servidor')).toBeInTheDocument());
    expect(screen.getByTestId('work-order-table')).toBeInTheDocument();
    // A wide table scrolls inside its box, so the box takes keyboard focus and has a name.
    const scroller = screen.getByRole('region', { name: 'Lista de órdenes de trabajo' });
    expect(scroller).toBe(screen.getByTestId('work-order-table-container'));
    expect(scroller).toHaveAttribute('tabindex', '0');

    expect(screen.getByRole('columnheader', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Prioridad' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fecha límite' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();

    const initialFetchCount = listWorkOrders.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));

    expect(screen.queryByTestId('work-order-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('work-order-cards')).toBeInTheDocument();
    expect(listWorkOrders.mock.calls.length).toBe(initialFetchCount);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Reparación de Servidor' }));
    expect(onEdit).toHaveBeenCalledWith(sampleWorkOrder);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Reparación de Servidor' }));
    expect(screen.getByTestId('delete-confirmation')).toHaveTextContent(
      '¿Eliminar orden "Reparación de Servidor"?',
    );
  });

  it('colors each status and gives urgent its own color, in table and card views', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        { ...sampleWorkOrder, id: 'a', title: 'Abierta', priority: WorkOrderPriority.URGENT },
        {
          ...sampleWorkOrder,
          id: 'b',
          title: 'Hecha',
          status: WorkOrderStatus.COMPLETED,
          priority: WorkOrderPriority.HIGH,
        },
      ],
    });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const openRow = (await screen.findByRole('link', { name: 'Abierta' })).closest('tr')!;
    expect(within(openRow).getByText('Abierta', { selector: 'span' })).toHaveClass(
      'status-open-badge',
    );
    expect(within(openRow).getByText('Urgente')).toHaveClass('priority-urgent-badge');
    const doneRow = screen.getByRole('link', { name: 'Hecha' }).closest('tr')!;
    expect(within(doneRow).getByText('Completada')).toHaveClass('status-completed-badge');
    expect(within(doneRow).getByText('Alta')).toHaveClass('priority-high-badge');
    // The neutral badge's own color utilities load later in the stylesheet and would win.
    for (const badge of [
      within(openRow).getByText('Urgente'),
      within(doneRow).getByText('Completada'),
    ]) {
      expect(badge).not.toHaveClass('text-fg-primary');
      expect(badge).not.toHaveClass('bg-panel-default');
    }

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
    const cards = screen.getByTestId('work-order-cards');
    expect(within(cards).getByText('Urgente')).toHaveClass('priority-urgent-badge');
    expect(within(cards).getByText('Completada')).toHaveClass('status-completed-badge');
  });

  describe('overdue due dates', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 6, 9, 0));
    });
    afterEach(() => vi.useRealTimers());

    it('marks pending orders past their due date as overdue, in table and card views', async () => {
      listWorkOrders.mockResolvedValue({
        items: [
          {
            ...sampleWorkOrder,
            id: 'late',
            title: 'Atrasada',
            dueDate: '2026-11-02T00:00:00.000Z',
          },
          { ...sampleWorkOrder, id: 'today', title: 'Hoy', dueDate: '2026-11-06T00:00:00.000Z' },
          {
            ...sampleWorkOrder,
            id: 'done',
            title: 'Terminada',
            status: WorkOrderStatus.COMPLETED,
            dueDate: '2026-11-01T00:00:00.000Z',
          },
        ],
      });
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

      const lateRow = (await screen.findByRole('link', { name: 'Atrasada' })).closest('tr')!;
      expect(within(lateRow).getByText('Vencida')).toBeInTheDocument();
      // The overdue date uses the readable red text color, not the button red.
      expect(lateRow.querySelector('.text-destructive-text')).not.toBeNull();
      const todayRow = screen.getByRole('link', { name: 'Hoy' }).closest('tr')!;
      expect(within(todayRow).queryByText('Vencida')).not.toBeInTheDocument();
      const doneRow = screen.getByRole('link', { name: 'Terminada' }).closest('tr')!;
      expect(within(doneRow).queryByText('Vencida')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
      // One badge says it is overdue and when it was due, instead of two red badges.
      expect(screen.getAllByText(/Vencida/)).toHaveLength(1);
      expect(screen.getByText('Vencida · 2 de noviembre de 2026')).toHaveClass('status-error');
    });
  });

  it('says no orders match the filters and offers to clear them', async () => {
    listWorkOrders.mockResolvedValue({ items: [] });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
    await screen.findByText('No hay órdenes de trabajo');

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por estado' }), {
      target: { value: 'open' },
    });

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    expect(
      screen.getByText('Ninguna orden coincide con la búsqueda o los filtros elegidos'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Creá tu primera orden para comenzar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() =>
      expect(listWorkOrders).toHaveBeenLastCalledWith({
        status: undefined,
        priority: undefined,
        clientId: undefined,
      }),
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveValue('');
    expect(await screen.findByText('No hay órdenes de trabajo')).toBeInTheDocument();
  });

  it('links the work-order title to its details page in table and card views', async () => {
    listWorkOrders.mockResolvedValue({ items: [{ ...sampleWorkOrder, id: 'wo/1 a' }] });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const tableLink = await screen.findByRole('link', { name: 'Reparación de Servidor' });
    expect(tableLink).toHaveAttribute('href', '/work-orders/details?id=wo%2F1%20a');

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));

    const cardLink = screen.getByRole('link', { name: 'Reparación de Servidor' });
    // Cards sit directly under the page h1, so each card title is an h2.
    expect(
      screen.getByRole('heading', { name: 'Reparación de Servidor', level: 2 }),
    ).toBeInTheDocument();
    expect(cardLink).toHaveAttribute('href', '/work-orders/details?id=wo%2F1%20a');
  });

  it('does not offer to delete an order that has payments, in table and card views', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        { ...sampleWorkOrder, id: 'paid', title: 'Con pagos', hasPayments: true },
        { ...sampleWorkOrder, id: 'free', title: 'Sin pagos', hasPayments: false },
      ],
    });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const blockedName =
      'No se puede eliminar Con pagos: tiene pagos registrados. Cancelala en su lugar.';
    const reason = 'No se puede eliminar una orden con pagos registrados. Cancelala en su lugar.';
    // Blocked, but still focusable so keyboard and screen-reader users reach the reason.
    const expectBlocked = (button: HTMLElement) => {
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('title', reason);
      button.focus();
      expect(button).toHaveFocus();
      fireEvent.click(button);
      // No delete confirmation opens.
      expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    };
    expectBlocked(await screen.findByRole('button', { name: blockedName }));
    expect(screen.getByRole('button', { name: 'Editar Con pagos' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Eliminar Sin pagos' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
    expectBlocked(screen.getByRole('button', { name: blockedName }));
    expect(screen.getByRole('button', { name: 'Eliminar Sin pagos' })).toBeEnabled();
    expect(deleteWorkOrder).not.toHaveBeenCalled();
  });

  it('says why on tap when an order with payments cannot be deleted', async () => {
    listWorkOrders.mockResolvedValue({
      items: [{ ...sampleWorkOrder, id: 'paid', title: 'Con pagos', hasPayments: true }],
    });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const blockedName =
      'No se puede eliminar Con pagos: tiene pagos registrados. Cancelala en su lugar.';
    const reason = 'No se puede eliminar una orden con pagos registrados. Cancelala en su lugar.';
    const expectNoteOnTap = (button: HTMLElement) => {
      expect(screen.queryByTestId('delete-blocked')).not.toBeInTheDocument();
      fireEvent.click(button);
      const note = screen.getByTestId('delete-blocked');
      expect(within(note).getByRole('status')).toHaveTextContent(reason);
      expect(within(note).getByRole('link', { name: 'Abrir orden' })).toHaveAttribute(
        'href',
        '/work-orders/details?id=paid',
      );
      fireEvent.click(within(note).getByRole('button', { name: 'Entendido' }));
      expect(screen.queryByTestId('delete-blocked')).not.toBeInTheDocument();
      expect(button).toHaveFocus();
    };

    expectNoteOnTap(await screen.findByRole('button', { name: blockedName }));
    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
    expectNoteOnTap(screen.getByRole('button', { name: blockedName }));
    expect(deleteWorkOrder).not.toHaveBeenCalled();
  });

  it('explains that an order with payments cannot be deleted', async () => {
    listWorkOrders.mockResolvedValue({ items: [sampleWorkOrder] });
    deleteWorkOrder.mockRejectedValue(new ApiRequestError('WORK_ORDER_HAS_PAYMENTS'));
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Reparación de Servidor')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Reparación de Servidor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText(
        'No se puede eliminar una orden con pagos registrados. Cancelala en su lugar.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No se pudo eliminar la orden. Intentá nuevamente.'),
    ).not.toBeInTheDocument();
  });

  it('shows the generic delete error for other failures', async () => {
    listWorkOrders.mockResolvedValue({ items: [sampleWorkOrder] });
    deleteWorkOrder.mockRejectedValue(new Error('network'));
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Reparación de Servidor')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Reparación de Servidor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText('No se pudo eliminar la orden. Intentá nuevamente.'),
    ).toBeInTheDocument();
  });

  describe.each(['table', 'cards'] as const)(
    'keyboard focus through an inline delete (%s)',
    (view) => {
      const secondWorkOrder: WorkOrderClientSummary = {
        ...sampleWorkOrder,
        id: 'wo-2',
        title: 'Instalación de Red',
      };

      async function openConfirmation(items: WorkOrderClientSummary[]) {
        listWorkOrders.mockResolvedValue({ items });
        render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
        await screen.findAllByText('Reparación de Servidor');
        if (view === 'cards') fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
        fireEvent.click(screen.getByRole('button', { name: 'Eliminar Reparación de Servidor' }));
      }

      it('moves focus to Cancelar when the confirmation opens, and back to Eliminar on cancel', async () => {
        await openConfirmation([sampleWorkOrder]);

        const cancel = within(screen.getByTestId('delete-confirmation')).getByRole('button', {
          name: 'Cancelar',
        });
        expect(cancel).toHaveFocus();

        fireEvent.click(cancel);
        expect(
          screen.getByRole('button', { name: 'Eliminar Reparación de Servidor' }),
        ).toHaveFocus();
      });

      it('moves focus to the next order once the delete succeeds', async () => {
        await openConfirmation([sampleWorkOrder, secondWorkOrder]);
        listWorkOrders.mockResolvedValue({ items: [secondWorkOrder] });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Eliminar Instalación de Red' })).toHaveFocus(),
        );
        expect(deleteWorkOrder).toHaveBeenCalledWith('wo-1');
      });

      it('moves focus to Nueva orden when the last order is deleted', async () => {
        await openConfirmation([sampleWorkOrder]);
        listWorkOrders.mockResolvedValue({ items: [] });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Nueva orden' })).toHaveFocus(),
        );
      });

      it('keeps focus on the confirmation when the delete fails', async () => {
        deleteWorkOrder.mockRejectedValue(new Error('network'));
        await openConfirmation([sampleWorkOrder]);

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await screen.findByText('No se pudo eliminar la orden. Intentá nuevamente.');
        expect(
          within(screen.getByTestId('delete-confirmation')).getByRole('button', {
            name: 'Eliminar',
          }),
        ).toHaveFocus();
      });
    },
  );

  it('shows request error alert when fetch fails', async () => {
    listWorkOrders.mockRejectedValueOnce(new Error('Fallo al conectar'));
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar las órdenes.');
    expect(alert).not.toHaveTextContent('Fallo al conectar');
    expect(screen.getByRole('button', { name: 'Cerrar alerta' })).toBeInTheDocument();
  });

  it('loads the orders again when Reintentar is pressed after a failure', async () => {
    listWorkOrders.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
    listWorkOrders.mockResolvedValueOnce({ items: [sampleWorkOrder] });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const alert = await screen.findByRole('alert');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect((await screen.findAllByText(sampleWorkOrder.title)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the formatted total price in table and card views, and a dash when unpriced', async () => {
    listWorkOrders.mockResolvedValue({
      items: [
        { ...sampleWorkOrder, totalPriceMinor: 15000000, currency: 'ARS' },
        { ...sampleWorkOrder, id: 'wo-2', title: 'Sin precio aún' },
      ],
    });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Reparación de Servidor')).toBeInTheDocument());
    expect(screen.getByRole('columnheader', { name: 'Precio total' })).toBeInTheDocument();
    expect(screen.getByText('$ 150.000,00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
    expect(screen.getByText('$ 150.000,00')).toBeInTheDocument();
  });

  describe('sorting and row actions', () => {
    const orders: WorkOrderClientSummary[] = [
      {
        ...sampleWorkOrder,
        id: 'old',
        title: 'Bravo',
        createdAt: '2026-01-10T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z',
      },
      { ...sampleWorkOrder, id: 'new', title: 'Charlie', createdAt: '2026-11-01T00:00:00.000Z' },
      { ...sampleWorkOrder, id: 'mid', title: 'Alfa', createdAt: '2026-06-01T00:00:00.000Z' },
    ];

    const rowTitles = () =>
      within(screen.getByTestId('work-order-table'))
        .getAllByRole('link')
        .map((link) => link.textContent);

    it('shows the newest created order first by default', async () => {
      listWorkOrders.mockResolvedValue({ items: orders });
      render(<WorkOrderList clients={[sampleClient]} />);

      await waitFor(() => expect(rowTitles()).toEqual(['Charlie', 'Alfa', 'Bravo']));
    });

    it('sorts by a column header: ascending, descending, then back to newest first', async () => {
      listWorkOrders.mockResolvedValue({ items: orders });
      render(<WorkOrderList clients={[sampleClient]} />);
      await screen.findByText('Charlie');

      const titleHeader = screen.getByRole('columnheader', { name: /Título/ });
      expect(titleHeader).toHaveAttribute('aria-sort', 'none');

      fireEvent.click(within(titleHeader).getByRole('button'));
      expect(rowTitles()).toEqual(['Alfa', 'Bravo', 'Charlie']);
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending');

      fireEvent.click(within(titleHeader).getByRole('button'));
      expect(rowTitles()).toEqual(['Charlie', 'Bravo', 'Alfa']);
      expect(titleHeader).toHaveAttribute('aria-sort', 'descending');

      fireEvent.click(within(titleHeader).getByRole('button'));
      expect(rowTitles()).toEqual(['Charlie', 'Alfa', 'Bravo']);
      expect(titleHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('remembers the chosen sort for the next visit', async () => {
      listWorkOrders.mockResolvedValue({ items: orders });
      const { unmount } = render(<WorkOrderList clients={[sampleClient]} />);
      await screen.findByText('Charlie');
      fireEvent.click(
        within(screen.getByRole('columnheader', { name: /Título/ })).getByRole('button'),
      );
      unmount();

      render(<WorkOrderList clients={[sampleClient]} />);
      await waitFor(() => expect(rowTitles()).toEqual(['Alfa', 'Bravo', 'Charlie']));
    });

    it('sorts the card view with the sort selector', async () => {
      listWorkOrders.mockResolvedValue({ items: orders });
      render(<WorkOrderList clients={[sampleClient]} />);
      await screen.findByText('Charlie');
      fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));

      fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'title:asc' } });

      const cardTitles = within(screen.getByTestId('work-order-cards'))
        .getAllByRole('link')
        .map((link) => link.textContent);
      expect(cardTitles).toEqual(['Alfa', 'Bravo', 'Charlie']);
    });

    it('loads every page of orders, not only the first one', async () => {
      listWorkOrders
        .mockResolvedValueOnce({ items: [orders[0]], nextCursor: 'old' })
        .mockResolvedValueOnce({ items: [orders[1], orders[2]] });
      render(<WorkOrderList clients={[sampleClient]} />);

      await waitFor(() => expect(rowTitles()).toEqual(['Charlie', 'Alfa', 'Bravo']));
      expect(listWorkOrders).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'old' }));
    });

    it('shows edit and delete as icon buttons that keep their accessible names', async () => {
      listWorkOrders.mockResolvedValue({ items: [sampleWorkOrder] });
      render(<WorkOrderList clients={[sampleClient]} />);
      await screen.findByText('Reparación de Servidor');

      const edit = screen.getByRole('button', { name: 'Editar Reparación de Servidor' });
      const remove = screen.getByRole('button', { name: 'Eliminar Reparación de Servidor' });
      for (const button of [edit, remove]) {
        expect(button).toHaveTextContent('');
        expect(button.querySelector('svg')).not.toBeNull();
      }
      expect(edit).toHaveAttribute('title', 'Editar');
      expect(remove).toHaveAttribute('title', 'Eliminar');
      expect(screen.getByTestId('work-order-row-actions')).toHaveClass('row-actions');
    });
  });

  describe('searching orders', () => {
    const perez = {
      ...sampleWorkOrder,
      id: 'perez',
      title: 'Notebook lenta',
      clientId: 'client-2',
      clientName: 'José Pérez',
    };
    const servidor = { ...sampleWorkOrder, id: 'servidor', title: 'Reparación de Servidor' };

    afterEach(() => window.history.replaceState(null, '', '/'));

    it('finds orders by title or client name as you type, ignoring accents', async () => {
      listWorkOrders.mockResolvedValue({ items: [perez, servidor] });
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
      await screen.findByRole('link', { name: 'Notebook lenta' });

      const search = screen.getByRole('searchbox', { name: 'Buscar órdenes' });
      expect(search).toHaveAttribute('placeholder', 'Título o cliente');

      fireEvent.change(search, { target: { value: 'perez' } });
      expect(screen.getByRole('link', { name: 'Notebook lenta' })).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Reparación de Servidor' }),
      ).not.toBeInTheDocument();

      fireEvent.change(search, { target: { value: 'SERVIDOR' } });
      expect(screen.getByRole('link', { name: 'Reparación de Servidor' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notebook lenta' })).not.toBeInTheDocument();
    });

    it('says nothing matches and clears the search with the filters', async () => {
      listWorkOrders.mockResolvedValue({ items: [perez, servidor] });
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
      await screen.findByRole('link', { name: 'Notebook lenta' });

      const search = screen.getByRole('searchbox', { name: 'Buscar órdenes' });
      fireEvent.change(search, { target: { value: 'impresora' } });
      expect(screen.getByText('Sin resultados')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
      expect(search).toHaveValue('');
      expect(screen.getByRole('link', { name: 'Notebook lenta' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Reparación de Servidor' })).toBeInTheDocument();
    });

    it('keeps the search and filters in the page URL', async () => {
      window.history.replaceState(null, '', '/work-orders?from=home');
      listWorkOrders.mockResolvedValue({ items: [perez, servidor] });
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
      await screen.findByRole('link', { name: 'Notebook lenta' });

      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar órdenes' }), {
        target: { value: 'pérez' },
      });
      fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'open' } });
      fireEvent.change(screen.getByLabelText('Filtrar por cliente'), {
        target: { value: 'client-1' },
      });

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('q')).toBe('pérez');
        expect(params.get('status')).toBe('open');
        expect(params.get('client')).toBe('client-1');
        expect(params.has('priority')).toBe(false);
        // Parameters it does not own are left alone.
        expect(params.get('from')).toBe('home');
      });
      expect(window.location.pathname).toBe('/work-orders');

      // A search that matches nothing shows "Limpiar filtros", which empties the URL again.
      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar órdenes' }), {
        target: { value: 'impresora' },
      });
      fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }));
      await waitFor(() => expect(window.location.search).toBe('?from=home'));
    });

    it('drops a client from the URL that is not in the client list', async () => {
      // e.g. a deleted client: the dropdown could not show it, so it must not filter silently.
      window.history.replaceState(null, '', '/work-orders?client=gone');
      listWorkOrders.mockResolvedValue({ items: [servidor] });
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

      expect(
        await screen.findByRole('link', { name: 'Reparación de Servidor' }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(listWorkOrders).toHaveBeenLastCalledWith(
          expect.objectContaining({ clientId: undefined }),
        ),
      );
      expect(screen.getByLabelText('Filtrar por cliente')).toHaveValue('');
      await waitFor(() =>
        expect(new URLSearchParams(window.location.search).has('client')).toBe(false),
      );
    });

    it('opens with the search and client filter from the URL', async () => {
      window.history.replaceState(null, '', '/work-orders?q=notebook&client=client-2');
      listWorkOrders.mockResolvedValue({ items: [perez] });
      const perezClient = { ...sampleClient, id: 'client-2', name: 'José Pérez' };
      render(
        <WorkOrderList clients={[sampleClient, perezClient]} onCreate={vi.fn()} onEdit={vi.fn()} />,
      );

      expect(await screen.findByRole('link', { name: 'Notebook lenta' })).toBeInTheDocument();
      expect(screen.getByRole('searchbox', { name: 'Buscar órdenes' })).toHaveValue('notebook');
      expect(listWorkOrders).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-2' }),
      );
    });
  });

  describe('on phones and between visits', () => {
    afterEach(() => vi.restoreAllMocks());

    it('remembers the chosen view for the next visit', async () => {
      listWorkOrders.mockResolvedValue({ items: [sampleWorkOrder] });
      const first = render(
        <WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />,
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Tarjetas' }));
      first.unmount();

      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
      expect(await screen.findByTestId('work-order-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('work-order-table')).not.toBeInTheDocument();
    });

    it('opens as cards on a phone when no view was chosen', async () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) => ({ matches: query === '(max-width: 639px)' }) as MediaQueryList,
      );
      listWorkOrders.mockResolvedValue({ items: [sampleWorkOrder] });
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
      expect(await screen.findByTestId('work-order-cards')).toBeInTheDocument();
    });

    it('folds the filters behind one Filtros button that counts the active ones', async () => {
      render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);
      const toggle = await screen.findByRole('button', { name: 'Filtros' });
      const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveClass('hidden', 'sm:contents');
      expect(within(panel as HTMLElement).getByLabelText('Filtrar por estado')).toBeInTheDocument();
      // Search stays outside, always visible.
      expect(within(panel as HTMLElement).queryByLabelText('Buscar órdenes')).toBeNull();

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(panel).not.toHaveClass('hidden');

      fireEvent.change(screen.getByLabelText('Filtrar por estado'), {
        target: { value: WorkOrderStatus.OPEN },
      });
      fireEvent.change(screen.getByLabelText('Filtrar por prioridad'), {
        target: { value: WorkOrderPriority.HIGH },
      });
      expect(screen.getByRole('button', { name: 'Filtros (2)' })).toBe(toggle);
    });
  });
});
