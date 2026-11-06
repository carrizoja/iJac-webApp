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
    expect(screen.getByTestId('work-order-table-container')).toBeInTheDocument();

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

  it('links the work-order title to its details page in table and card views', async () => {
    listWorkOrders.mockResolvedValue({ items: [{ ...sampleWorkOrder, id: 'wo/1 a' }] });
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const tableLink = await screen.findByRole('link', { name: 'Reparación de Servidor' });
    expect(tableLink).toHaveAttribute('href', '/work-orders/details?id=wo%2F1%20a');

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));

    const cardLink = screen.getByRole('link', { name: 'Reparación de Servidor' });
    expect(cardLink).toHaveAttribute('href', '/work-orders/details?id=wo%2F1%20a');
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

  it('shows request error alert when fetch fails', async () => {
    listWorkOrders.mockRejectedValueOnce(new Error('Fallo al conectar'));
    render(<WorkOrderList clients={[sampleClient]} onCreate={vi.fn()} onEdit={vi.fn()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar las órdenes. Intentá nuevamente.');
    expect(alert).not.toHaveTextContent('Fallo al conectar');
    expect(screen.getByRole('button', { name: 'Cerrar alerta' })).toBeInTheDocument();
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
});
