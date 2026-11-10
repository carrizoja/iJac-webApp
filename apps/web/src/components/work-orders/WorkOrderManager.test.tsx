import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Client } from '@ijac/shared';

const {
  listClients,
  listWorkOrders,
  deleteWorkOrder,
  getWorkOrder,
  updateWorkOrder,
  createWorkOrder,
} = vi.hoisted(() => ({
  listClients: vi.fn(),
  listWorkOrders: vi.fn(),
  deleteWorkOrder: vi.fn(),
  getWorkOrder: vi.fn(),
  updateWorkOrder: vi.fn(),
  createWorkOrder: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({
  listClients,
  listWorkOrders,
  deleteWorkOrder,
  getWorkOrder,
  updateWorkOrder,
  createWorkOrder,
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

const summary = {
  id: 'wo-1',
  title: 'Revisión',
  clientId: 'c1',
  clientName: 'Acme',
  status: 'open',
  priority: 'normal',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const fullOrder = {
  id: 'wo-1',
  title: 'Revisión',
  description: 'Cambiar el disco del servidor.',
  clientId: 'c1',
  status: 'open',
  priority: 'normal',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

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

  it('leaves the page heading to the page, without repeating it', async () => {
    listClients.mockResolvedValue({ items: [] });
    render(<WorkOrderManager />);
    await screen.findByRole('button', { name: 'Nueva orden' });
    expect(screen.queryByRole('heading', { name: 'Órdenes de trabajo' })).not.toBeInTheDocument();
  });

  describe('bringing the form into view', () => {
    const originalScroll = Element.prototype.scrollIntoView;
    afterEach(() => {
      Element.prototype.scrollIntoView = originalScroll;
    });

    it('scrolls to and focuses the form heading when editing a row', async () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      listClients.mockResolvedValue({ items: [client('c1', 'Acme')] });
      listWorkOrders.mockResolvedValue({ items: [summary] });
      getWorkOrder.mockResolvedValue(fullOrder);
      render(<WorkOrderManager />);

      const edit = await screen.findByRole('button', { name: 'Editar Revisión' });
      edit.focus();
      fireEvent.click(edit);

      const heading = await screen.findByRole('heading', { name: 'Editar orden' });
      expect(heading).toHaveFocus();
      expect(scroll.mock.contexts[0]).toBe(screen.getByTestId('work-order-form-panel'));

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(edit).toHaveFocus();
    });
  });

  describe('editing from the list', () => {
    beforeEach(() => {
      listClients.mockResolvedValue({ items: [client('c1', 'Acme')] });
      listWorkOrders.mockResolvedValue({ items: [summary] });
    });

    it('loads the full order so the form shows and keeps its description', async () => {
      getWorkOrder.mockResolvedValue(fullOrder);
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Editar Revisión' }));

      expect(getWorkOrder).toHaveBeenCalledWith('wo-1');
      expect(await screen.findByLabelText(/descripción/i)).toHaveValue(
        'Cambiar el disco del servidor.',
      );
    });

    it('does not open the form when the order cannot be loaded', async () => {
      getWorkOrder.mockRejectedValue(new Error('NETWORK_ERROR'));
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Editar Revisión' }));

      expect(
        await screen.findByText('No se pudo cargar la orden para editarla. Probá de nuevo.'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('work-order-form-panel')).not.toBeInTheDocument();
    });
  });

  describe('switching between orders', () => {
    const orderA = { ...fullOrder, id: 'wo-a', title: 'Alfa', description: 'Desc A' };
    const orderB = { ...fullOrder, id: 'wo-b', title: 'Beta', description: 'Desc B' };

    beforeEach(() => {
      listClients.mockResolvedValue({ items: [client('c1', 'Acme')] });
      listWorkOrders.mockResolvedValue({
        items: [
          { ...summary, id: 'wo-a', title: 'Alfa' },
          { ...summary, id: 'wo-b', title: 'Beta' },
        ],
      });
      updateWorkOrder.mockResolvedValue(orderB);
    });

    async function saveAndExpectOnlyB() {
      fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
      await waitFor(() => expect(updateWorkOrder).toHaveBeenCalledTimes(1));
      expect(updateWorkOrder).toHaveBeenCalledWith(
        'wo-b',
        expect.objectContaining({ title: 'Beta', description: 'Desc B' }),
      );
    }

    it('shows and saves the second order after editing the first', async () => {
      getWorkOrder.mockImplementation(async (id: string) => (id === 'wo-a' ? orderA : orderB));
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Editar Alfa' }));
      expect(await screen.findByLabelText(/título/i)).toHaveValue('Alfa');
      fireEvent.click(screen.getByRole('button', { name: 'Editar Beta' }));

      await waitFor(() => expect(screen.getByLabelText(/título/i)).toHaveValue('Beta'));
      expect(screen.getByLabelText(/descripción/i)).toHaveValue('Desc B');
      await saveAndExpectOnlyB();
    });

    it('ignores a slower response for an order clicked earlier', async () => {
      let resolveA: (order: typeof orderA) => void = () => {};
      getWorkOrder.mockImplementation((id: string) =>
        id === 'wo-a'
          ? new Promise((resolve) => {
              resolveA = resolve;
            })
          : Promise.resolve(orderB),
      );
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Editar Alfa' }));
      fireEvent.click(screen.getByRole('button', { name: 'Editar Beta' }));
      expect(await screen.findByLabelText(/título/i)).toHaveValue('Beta');
      await act(async () => resolveA(orderA));

      expect(screen.getByLabelText(/título/i)).toHaveValue('Beta');
      await saveAndExpectOnlyB();
    });

    it('shows the order after switching from a new order', async () => {
      getWorkOrder.mockResolvedValue(orderB);
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Nueva orden' }));
      expect(await screen.findByLabelText(/título/i)).toHaveValue('');
      fireEvent.click(screen.getByRole('button', { name: 'Editar Beta' }));

      await waitFor(() => expect(screen.getByLabelText(/título/i)).toHaveValue('Beta'));
    });
  });

  describe('after saving', () => {
    beforeEach(() => {
      listClients.mockResolvedValue({ items: [client('c1', 'Acme')] });
      listWorkOrders.mockResolvedValue({ items: [summary] });
    });

    it('confirms a new order by name, links to it, and puts focus on the confirmation', async () => {
      createWorkOrder.mockResolvedValue({ ...fullOrder, id: 'wo-new', title: 'Cambio de disco' });
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Nueva orden' }));
      const form = within(screen.getByTestId('work-order-form-panel'));
      fireEvent.change(form.getByLabelText(/título/i), { target: { value: 'Cambio de disco' } });
      await waitFor(() => expect(form.getByRole('option', { name: 'Acme' })).toBeInTheDocument());
      fireEvent.change(form.getByLabelText(/^cliente/i), { target: { value: 'c1' } });
      fireEvent.change(form.getByLabelText(/estado/i), { target: { value: 'open' } });
      fireEvent.change(form.getByLabelText(/prioridad/i), { target: { value: 'normal' } });
      fireEvent.click(form.getByRole('button', { name: 'Crear orden' }));

      const notice = await screen.findByTestId('work-order-saved');
      expect(within(notice).getByRole('status')).toHaveTextContent(
        'Orden creada · Cambio de disco',
      );
      expect(within(notice).getByRole('link', { name: 'Abrir orden' })).toHaveAttribute(
        'href',
        '/work-orders/details?id=wo-new',
      );
      expect(screen.queryByTestId('work-order-form-panel')).not.toBeInTheDocument();
      await waitFor(() => expect(notice).toHaveFocus());
    });

    it('confirms an edit, and clears the confirmation when another form opens', async () => {
      getWorkOrder.mockResolvedValue(fullOrder);
      updateWorkOrder.mockResolvedValue({ ...fullOrder, title: 'Revisión anual' });
      render(<WorkOrderManager />);

      fireEvent.click(await screen.findByRole('button', { name: 'Editar Revisión' }));
      fireEvent.click(await screen.findByRole('button', { name: /guardar cambios/i }));

      const notice = await screen.findByTestId('work-order-saved');
      expect(within(notice).getByRole('status')).toHaveTextContent(
        'Orden guardada · Revisión anual',
      );

      fireEvent.click(await screen.findByRole('button', { name: 'Nueva orden' }));
      expect(screen.queryByTestId('work-order-saved')).not.toBeInTheDocument();
    });
  });

  it('switches from editing an order to a blank new order', async () => {
    listClients.mockResolvedValue({ items: [client('c1', 'Acme')] });
    listWorkOrders.mockResolvedValue({ items: [summary] });
    getWorkOrder.mockResolvedValue(fullOrder);
    render(<WorkOrderManager />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Revisión' }));
    expect(await screen.findByLabelText(/título/i)).toHaveValue('Revisión');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva orden' }));

    // The page h1 is the only heading above it, so the form heading is an h2.
    expect(
      await screen.findByRole('heading', { name: 'Nueva orden', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toHaveValue('');
  });
});
