import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Client, WorkOrder } from '@ijac/shared';
import { WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';
import { setLanguage } from '../../i18n/language';

const { getClient, getWorkOrder } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getWorkOrder: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({ getClient, getWorkOrder }));

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
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Acme Argentina')).toBeInTheDocument();
    expect(screen.getByText('Validar la instalación y documentar resultados.')).toBeInTheDocument();
    expect(screen.getByText('Estado: En progreso')).toBeInTheDocument();
    expect(screen.getByText('Prioridad: Alta')).toBeInTheDocument();
    expect(screen.getByText('Creada')).toBeInTheDocument();
    expect(screen.getByText('Actualizada')).toBeInTheDocument();
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
});
