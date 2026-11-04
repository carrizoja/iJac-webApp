import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';

const { listWorkOrders, deleteWorkOrder } = vi.hoisted(() => ({
  listWorkOrders: vi.fn(),
  deleteWorkOrder: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({ listWorkOrders, deleteWorkOrder }));

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
});
