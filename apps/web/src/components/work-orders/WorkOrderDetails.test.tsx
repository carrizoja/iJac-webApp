import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Client, WorkOrder } from '@ijac/shared';
import { Currency, WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';
import { setLanguage } from '../../i18n/language';

const { getClient, getWorkOrder, listPayments, updateWorkOrder, listClients } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getWorkOrder: vi.fn(),
  listPayments: vi.fn(),
  updateWorkOrder: vi.fn(),
  listClients: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({
  ApiRequestError: class extends Error {},
  getClient,
  getWorkOrder,
  listPayments,
  updateWorkOrder,
  listClients,
  createWorkOrder: vi.fn(),
  recordPayment: vi.fn(),
  voidPayment: vi.fn(),
}));

import { WorkOrderDetails } from './WorkOrderDetails';

const workOrder: WorkOrder = {
  id: 'work-order-1',
  title: 'Revisión remota',
  description: 'Validar la instalación y documentar resultados.',
  status: WorkOrderStatus.IN_PROGRESS,
  priority: WorkOrderPriority.HIGH,
  clientId: 'client-1',
  dueDate: '2026-08-15T12:00:00.000Z',
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-10T15:30:00.000Z',
};

const client: Client = {
  id: 'client-1',
  name: 'Acme Corp',
  email: 'contacto@acme.test',
  phone: '555-0100',
  organization: 'Acme Argentina',
  workOrderCount: 1,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

function expectDocumentActionsAbsent() {
  expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar como PDF' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Compartir por WhatsApp' })).not.toBeInTheDocument();
}

describe('WorkOrderDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPayments.mockResolvedValue({ items: [], balance: null, canManage: false });
    window.history.replaceState({}, '', '/work-orders/details');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading state while requesting the order', () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockReturnValue(new Promise(() => {}));

    render(<WorkOrderDetails />);

    expect(screen.getByTestId('work-order-details-loading')).toBeInTheDocument();
    expect(screen.getByText('Cargando detalle de la orden...')).toBeInTheDocument();
    expectDocumentActionsAbsent();
  });

  it('reports a missing query ID without calling the API', async () => {
    render(<WorkOrderDetails />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falta el identificador de la orden de trabajo.',
    );
    expect(getWorkOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Volver a órdenes' })).toHaveAttribute(
      'href',
      '/work-orders',
    );
    expectDocumentActionsAbsent();
  });

  it('shows the payments panel for the loaded order', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue(workOrder);
    getClient.mockResolvedValue(client);

    render(<WorkOrderDetails />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Pagos' })).toBeInTheDocument();
    expect(listPayments).toHaveBeenCalledWith('work-order-1');
  });

  it('loads and presents the order with its related client', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work%2Forder%201');
    getWorkOrder.mockResolvedValue(workOrder);
    getClient.mockResolvedValue(client);

    render(<WorkOrderDetails />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revisión remota' }),
    ).toBeInTheDocument();
    expect(getWorkOrder).toHaveBeenCalledWith('work/order 1');
    expect(getClient).toHaveBeenCalledWith('client-1');
    // The header names the client and the due date; they are not repeated below it.
    expect(screen.getAllByText(/Acme Corp/)).toHaveLength(1);
    expect(screen.queryByRole('heading', { level: 2, name: 'Cliente' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/15 de agosto de 2026/)).toHaveLength(1);
    expect(screen.getByText('Validar la instalación y documentar resultados.')).toBeInTheDocument();
    expect(screen.getByText('Estado: En progreso')).toHaveClass('status-in-progress-badge');
    expect(screen.getByText('Prioridad: Alta')).toHaveClass('priority-high-badge');
    expect(screen.getByText('Estado: En progreso')).not.toHaveClass('text-fg-primary');
    expect(screen.getByText('Creada')).toBeInTheDocument();
    expect(screen.getByText('Actualizada')).toBeInTheDocument();
  });

  describe('editing in place', () => {
    beforeEach(() => {
      window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
      getWorkOrder.mockResolvedValue(workOrder);
      getClient.mockResolvedValue(client);
      listClients.mockResolvedValue({ items: [client] });
    });

    it('opens the form with the full order, saves it and shows the result', async () => {
      const renamed = { ...workOrder, title: 'Revisión remota y local' };
      updateWorkOrder.mockResolvedValue(renamed);
      render(<WorkOrderDetails />);

      fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

      const heading = await screen.findByRole('heading', { name: 'Editar orden' });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(screen.getByRole('combobox', { name: 'Cambiar estado' })).toBeDisabled();
      expect(screen.getByLabelText(/descripción/i)).toHaveValue(
        'Validar la instalación y documentar resultados.',
      );
      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Acme Corp' })).toBeInTheDocument(),
      );

      getWorkOrder.mockResolvedValue(renamed);
      fireEvent.change(screen.getByLabelText(/título/i), {
        target: { value: 'Revisión remota y local' },
      });
      fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

      await waitFor(() =>
        expect(updateWorkOrder).toHaveBeenCalledWith(
          'work-order-1',
          expect.objectContaining({
            title: 'Revisión remota y local',
            description: 'Validar la instalación y documentar resultados.',
          }),
        ),
      );
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Revisión remota y local' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Editar orden' })).not.toBeInTheDocument();
    });

    it('closes the form on cancel and returns focus to Editar', async () => {
      render(<WorkOrderDetails />);

      const edit = await screen.findByRole('button', { name: 'Editar' });
      edit.focus();
      fireEvent.click(edit);
      await screen.findByRole('heading', { name: 'Editar orden' });
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('heading', { name: 'Editar orden' })).not.toBeInTheDocument();
      await waitFor(() => expect(edit).toHaveFocus());
    });
  });

  it('names a client once when the organization repeats the name', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue(workOrder);
    getClient.mockResolvedValue({ ...client, organization: ' acme corp ' });
    render(<WorkOrderDetails />);

    const header = (await screen.findByRole('heading', { level: 1 })).closest(
      'header',
    ) as HTMLElement;
    expect(within(header).getByText('Acme Corp')).toBeInTheDocument();
    expect(within(header).queryByText(/\(/)).not.toBeInTheDocument();
  });

  describe('as a workspace', () => {
    beforeEach(() => {
      window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
      getWorkOrder.mockResolvedValue(workOrder);
      getClient.mockResolvedValue(client);
    });

    it('leads with the client and the payments, before the description', async () => {
      render(<WorkOrderDetails />);

      const header = (
        await screen.findByRole('heading', { level: 1, name: 'Revisión remota' })
      ).closest('header') as HTMLElement;
      expect(within(header).getByText('Acme Corp (Acme Argentina)')).toBeInTheDocument();
      const payments = await screen.findByRole('heading', { level: 2, name: 'Pagos' });
      const description = screen.getByRole('heading', { level: 2, name: 'Descripción' });
      expect(
        payments.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('does not save a status until the save button is pressed', async () => {
      updateWorkOrder.mockResolvedValue({ ...workOrder, status: WorkOrderStatus.COMPLETED });
      render(<WorkOrderDetails />);

      const select = await screen.findByRole('combobox', { name: 'Cambiar estado' });
      const save = screen.getByRole('button', { name: 'Guardar estado' });
      expect(save).toBeDisabled();

      fireEvent.change(select, { target: { value: WorkOrderStatus.OPEN } });
      fireEvent.change(select, { target: { value: WorkOrderStatus.COMPLETED } });
      expect(updateWorkOrder).not.toHaveBeenCalled();
      expect(save).toBeEnabled();

      fireEvent.click(save);

      await waitFor(() =>
        expect(updateWorkOrder).toHaveBeenCalledWith('work-order-1', {
          status: WorkOrderStatus.COMPLETED,
        }),
      );
      expect(updateWorkOrder).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('Estado: Completada')).toBeInTheDocument();
      expect(screen.getByTestId('work-order-status-announcement')).toHaveTextContent(
        'Estado actualizado: Completada',
      );
      expect(save).toBeDisabled();
    });

    it('asks before cancelling and tells the payments panel once confirmed', async () => {
      listPayments.mockResolvedValue({
        items: [],
        balance: { currency: Currency.ARS, totalMinor: 1000, paidMinor: 0, remainingMinor: 1000 },
        canManage: true,
      });
      updateWorkOrder.mockResolvedValue({ ...workOrder, status: WorkOrderStatus.CANCELLED });
      render(<WorkOrderDetails />);

      const select = await screen.findByRole('combobox', { name: 'Cambiar estado' });
      expect(select).toHaveValue(WorkOrderStatus.IN_PROGRESS);
      fireEvent.change(select, { target: { value: WorkOrderStatus.CANCELLED } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' }));

      const dialog = await screen.findByRole('alertdialog', { name: '¿Cancelar esta orden?' });
      expect(
        within(dialog).getByText(
          'Mientras esté cancelada no vas a poder registrar pagos. Podés volver a cambiar el estado después.',
        ),
      ).toBeInTheDocument();
      expect(updateWorkOrder).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar orden' }));

      await waitFor(() =>
        expect(updateWorkOrder).toHaveBeenCalledWith('work-order-1', {
          status: WorkOrderStatus.CANCELLED,
        }),
      );
      expect(await screen.findByText('Estado: Cancelada')).toHaveClass('status-cancelled-badge');
      expect(screen.getByTestId('work-order-status-announcement')).toHaveTextContent(
        'Estado actualizado: Cancelada',
      );
      expect(
        await screen.findByText('La orden está cancelada: no se pueden registrar nuevos pagos.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('keeps the order as it was when the cancellation is not confirmed', async () => {
      render(<WorkOrderDetails />);

      const select = await screen.findByRole('combobox', { name: 'Cambiar estado' });
      fireEvent.change(select, { target: { value: WorkOrderStatus.CANCELLED } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' }));
      const dialog = await screen.findByRole('alertdialog', { name: '¿Cancelar esta orden?' });

      fireEvent.click(within(dialog).getByRole('button', { name: 'Volver' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(updateWorkOrder).not.toHaveBeenCalled();
      expect(select).toHaveValue(WorkOrderStatus.IN_PROGRESS);
      expect(screen.getByText('Estado: En progreso')).toBeInTheDocument();
    });

    it('keeps the previous status and says so when the change fails', async () => {
      updateWorkOrder.mockRejectedValue(new Error('NETWORK_ERROR'));
      render(<WorkOrderDetails />);

      const select = await screen.findByRole('combobox', { name: 'Cambiar estado' });
      fireEvent.change(select, { target: { value: WorkOrderStatus.COMPLETED } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' }));

      expect(
        await screen.findByText('No se pudo cambiar el estado. Probá de nuevo.'),
      ).toBeInTheDocument();
      expect(select).toHaveValue(WorkOrderStatus.IN_PROGRESS);
      expect(screen.getByText('Estado: En progreso')).toBeInTheDocument();
    });

    describe('overdue', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 7, 20, 9, 0));
      });
      afterEach(() => vi.useRealTimers());

      it('flags a pending order past its due date', async () => {
        render(<WorkOrderDetails />);
        const header = (await screen.findByRole('heading', { level: 1 })).closest(
          'header',
        ) as HTMLElement;
        expect(within(header).getByText('Vencida')).toBeInTheDocument();
        expect(within(header).getByText(/^Vencimiento/)).toHaveClass('text-destructive-text');
      });

      it('does not flag a completed order', async () => {
        getWorkOrder.mockResolvedValue({ ...workOrder, status: WorkOrderStatus.COMPLETED });
        render(<WorkOrderDetails />);
        await screen.findByRole('heading', { level: 1 });
        expect(screen.queryByText('Vencida')).not.toBeInTheDocument();
      });
    });
  });

  it('offers exactly the PDF and WhatsApp actions for a loaded order', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue(workOrder);
    getClient.mockResolvedValue(client);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(<WorkOrderDetails />);

    const actionGroup = await screen.findByRole('group', { name: 'Acciones del documento' });
    const pdfButton = screen.getByRole('button', { name: 'Guardar como PDF' });
    const whatsAppLink = screen.getByRole('link', { name: 'Compartir por WhatsApp' });

    expect(actionGroup.querySelectorAll('button, a')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument();
    fireEvent.click(pdfButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/elegí “Guardar como PDF”/)).toBeInTheDocument();
    expect(whatsAppLink).toHaveAttribute('target', '_blank');
    expect(whatsAppLink).toHaveAttribute('rel', 'noopener noreferrer');

    const expectedMessage = [
      'Orden de trabajo: Revisión remota',
      'Cliente: Acme Corp (Acme Argentina)',
      'Estado: En progreso',
      'Prioridad: Alta',
      'Vencimiento: 15 de agosto de 2026',
      `Detalle: ${window.location.href}`,
    ].join('\n');

    expect(whatsAppLink).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent(expectedMessage)}`,
    );
    expect(decodeURIComponent(whatsAppLink.getAttribute('href') ?? '')).not.toMatch(
      /contacto@acme\.test|555-0100|Validar la instalación/,
    );
  });

  it('localizes the WhatsApp message and missing due date in English', async () => {
    setLanguage('en');
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue({ ...workOrder, dueDate: undefined });
    getClient.mockResolvedValue({ ...client, organization: undefined });

    render(<WorkOrderDetails />);

    const whatsAppLink = await screen.findByRole('link', { name: 'Share via WhatsApp' });
    const expectedMessage = [
      'Work order: Revisión remota',
      'Client: Acme Corp',
      'Status: In progress',
      'Priority: High',
      'Due: No date',
      `Details: ${window.location.href}`,
    ].join('\n');

    expect(whatsAppLink).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent(expectedMessage)}`,
    );
  });

  it('shows a useful not-found error', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=missing');
    getWorkOrder.mockRejectedValue(new Error('NOT_FOUND'));

    render(<WorkOrderDetails />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No encontramos la orden de trabajo solicitada.',
      );
    });
    expect(getClient).not.toHaveBeenCalled();
    expectDocumentActionsAbsent();
  });

  it('loads the order again when Reintentar is pressed after a failure', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
    getWorkOrder.mockResolvedValueOnce(workOrder);
    getClient.mockResolvedValue(client);

    render(<WorkOrderDetails />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo cargar la orden de trabajo.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: workOrder.title }),
    ).toBeInTheDocument();
    expect(getWorkOrder).toHaveBeenCalledTimes(2);
  });

  it('offers no retry when the order does not exist', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=missing');
    getWorkOrder.mockRejectedValue(new Error('NOT_FOUND'));

    render(<WorkOrderDetails />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No encontramos la orden de trabajo solicitada.');
    expect(within(alert).queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('shows the formatted total price inside the printable document', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue({
      ...workOrder,
      totalPriceMinor: 15000050,
      currency: Currency.ARS,
    });
    getClient.mockResolvedValue(client);

    render(<WorkOrderDetails />);

    const price = await screen.findByText('$ 150.000,50');
    expect(screen.getByText('Precio total')).toBeInTheDocument();
    expect(price.closest('.work-order-print-document')).not.toBeNull();
    expect(price.closest('.work-order-print-hidden')).toBeNull();
  });

  it('formats a USD total price', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue({
      ...workOrder,
      totalPriceMinor: 125050,
      currency: Currency.USD,
    });
    getClient.mockResolvedValue(client);

    render(<WorkOrderDetails />);

    expect(await screen.findByText('US$ 1.250,50')).toBeInTheDocument();
  });

  it('indicates when the order has no price', async () => {
    window.history.replaceState({}, '', '/work-orders/details?id=work-order-1');
    getWorkOrder.mockResolvedValue(workOrder);
    getClient.mockResolvedValue(client);

    render(<WorkOrderDetails />);

    expect(await screen.findByText('Sin precio')).toBeInTheDocument();
  });
});
