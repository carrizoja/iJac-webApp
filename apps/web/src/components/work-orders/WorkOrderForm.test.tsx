import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkOrderForm } from './WorkOrderForm';
import type { Client, WorkOrder } from '@ijac/shared';
import { Currency, WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';

vi.mock('../../lib/resources', () => {
  class ApiRequestError extends Error {
    constructor(
      readonly code: string,
      readonly fieldErrors?: Record<string, string>,
    ) {
      super(code);
    }
  }
  return { ApiRequestError, createWorkOrder: vi.fn(), updateWorkOrder: vi.fn() };
});

import { ApiRequestError, createWorkOrder, updateWorkOrder } from '../../lib/resources';

describe('WorkOrderForm', () => {
  const now = new Date().toISOString();
  const clients: Client[] = [
    {
      id: 'c1',
      name: 'Acme',
      email: 'a@a.com',
      phone: '1',
      organization: '',
      notes: '',
      workOrderCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation errors for empty required fields', async () => {
    render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(screen.getByText(/título es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/cliente es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/estado es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/prioridad es obligatoria/i)).toBeInTheDocument();
      expect(createWorkOrder).not.toHaveBeenCalled();
    });
  });

  it('opens the native due-date calendar from its explicit control', () => {
    const originalShowPicker = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'showPicker',
    );
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPicker,
    });

    render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: /abrir calendario de fecha de vencimiento/i,
      }),
    );

    expect(showPicker).toHaveBeenCalledOnce();
    expect(document.getElementById('dueDate')).toHaveFocus();

    if (originalShowPicker) {
      Object.defineProperty(HTMLInputElement.prototype, 'showPicker', originalShowPicker);
    } else {
      delete (HTMLInputElement.prototype as { showPicker?: () => void }).showPicker;
    }
  });

  it('calls createWorkOrder with selected client and status', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockResolvedValueOnce({ id: 'wo1' });
    render(<WorkOrderForm clients={clients} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Reparar red' } });
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'in-progress' } });
    fireEvent.change(screen.getByLabelText(/prioridad/i), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Reparar red',
          clientId: 'c1',
          status: 'in-progress',
          priority: 'high',
        }),
      );
      expect(mockedCreate.mock.calls[0][0]).not.toHaveProperty('dueDate');
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('shows pending state (disabled button) while submitting', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ id: 'wo1' }), 100);
        }),
    );
    render(<WorkOrderForm clients={clients} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Reparar red' } });
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'in-progress' } });
    fireEvent.change(screen.getByLabelText(/prioridad/i), { target: { value: 'high' } });

    const submitButton = screen.getByRole('button', { name: /crear orden/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('displays API error message on creation failure', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockRejectedValueOnce(new Error('Failed to create work order'));
    render(<WorkOrderForm clients={clients} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Reparar red' } });
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'in-progress' } });
    fireEvent.change(screen.getByLabelText(/prioridad/i), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(
        screen.getByText('No se pudo guardar la orden. Intentá nuevamente.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Failed to create work order')).not.toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('preserves form data for editing and updates existing work order', async () => {
    const onSaved = vi.fn();
    const existingWO: WorkOrder = {
      id: 'wo1',
      clientId: 'c1',
      title: 'Fix network',
      status: WorkOrderStatus.OPEN,
      priority: WorkOrderPriority.HIGH,
      dueDate: '2025-01-20',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockedUpdate = updateWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedUpdate.mockResolvedValueOnce(existingWO);

    render(
      <WorkOrderForm
        clients={clients}
        workOrder={existingWO}
        onSaved={onSaved}
        onCancel={() => {}}
      />,
    );

    // Form should be pre-populated
    expect((screen.getByLabelText(/título/i) as HTMLInputElement).value).toBe('Fix network');
    expect((screen.getByLabelText(/estado/i) as HTMLSelectElement).value).toBe('open');

    // Change title and submit
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Fix network - URGENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith(
        'wo1',
        expect.objectContaining({ title: 'Fix network - URGENT' }),
      );
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('keeps the description of the order being edited', async () => {
    const existing: WorkOrder = {
      id: 'wo2',
      clientId: 'c1',
      title: 'Revisar red',
      description: 'Revisar el router del segundo piso.',
      status: WorkOrderStatus.OPEN,
      priority: WorkOrderPriority.NORMAL,
      createdAt: now,
      updatedAt: now,
    };
    const mockedUpdate = updateWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedUpdate.mockResolvedValueOnce(existing);
    render(
      <WorkOrderForm clients={clients} workOrder={existing} onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByLabelText(/descripción/i)).toHaveValue(
      'Revisar el router del segundo piso.',
    );
    fireEvent.change(screen.getByLabelText(/prioridad/i), {
      target: { value: WorkOrderPriority.HIGH },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'wo2',
        expect.objectContaining({
          priority: WorkOrderPriority.HIGH,
          description: 'Revisar el router del segundo piso.',
        }),
      ),
    );
  });

  it('clears validation errors when form fields are corrected', async () => {
    render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
    // Try to submit with empty fields
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(screen.getByText(/título es obligatorio/i)).toBeInTheDocument();
    });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Reparar red' } });
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: 'c1' } });

    // Errors should be cleared when attempting to submit again
    const mockedCreate = createWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockResolvedValueOnce({ id: 'wo1' });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));

    await waitFor(() => {
      expect(screen.queryByText(/título es obligatorio/i)).not.toBeInTheDocument();
    });
  });

  describe('pricing', () => {
    function fillRequired() {
      fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Reparar red' } });
      fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: 'c1' } });
      fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'open' } });
      fireEvent.change(screen.getByLabelText(/prioridad/i), { target: { value: 'high' } });
    }
    const submitCreate = () =>
      fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    const created = createWorkOrder as unknown as ReturnType<typeof vi.fn>;
    const updated = updateWorkOrder as unknown as ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Earlier tests install persistent implementations; start from a clean mock.
      created.mockReset();
      updated.mockReset();
    });

    it('omits price and currency when left blank', async () => {
      created.mockResolvedValueOnce({ id: 'wo1' });
      render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      submitCreate();
      await waitFor(() => expect(created).toHaveBeenCalled());
      expect(created.mock.calls[0][0]).not.toHaveProperty('totalPriceMinor');
      expect(created.mock.calls[0][0]).not.toHaveProperty('currency');
    });

    it('sends the parsed price in minor units with its currency', async () => {
      created.mockResolvedValueOnce({ id: 'wo1' });
      render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/precio total/i), { target: { value: '150.000,50' } });
      fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: 'ARS' } });
      submitCreate();
      await waitFor(() =>
        expect(created).toHaveBeenCalledWith(
          expect.objectContaining({ totalPriceMinor: 15000050, currency: 'ARS' }),
        ),
      );
    });

    it('rejects an unparseable price without calling the API', async () => {
      render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/precio total/i), { target: { value: '12,345' } });
      fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: 'USD' } });
      submitCreate();
      expect(await screen.findByText(/importe válido/i)).toBeInTheDocument();
      expect(created).not.toHaveBeenCalled();
    });

    it('requires a currency when a price is entered', async () => {
      render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/precio total/i), { target: { value: '100' } });
      submitCreate();
      expect(await screen.findByText(/elegí la moneda/i)).toBeInTheDocument();
      expect(created).not.toHaveBeenCalled();
    });

    it('requires a price when a currency is chosen', async () => {
      render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: 'USD' } });
      submitCreate();
      expect(await screen.findByText(/ingresá el precio/i)).toBeInTheDocument();
      expect(created).not.toHaveBeenCalled();
    });

    it('prefills the price and currency when editing', () => {
      render(
        <WorkOrderForm
          clients={clients}
          workOrder={{
            id: 'wo1',
            clientId: 'c1',
            title: 'Fix',
            status: WorkOrderStatus.OPEN,
            priority: WorkOrderPriority.HIGH,
            totalPriceMinor: 15000050,
            currency: Currency.USD,
            createdAt: now,
            updatedAt: now,
          }}
          onSaved={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/precio total/i) as HTMLInputElement).value).toBe('150.000,50');
      expect((screen.getByLabelText(/moneda/i) as HTMLSelectElement).value).toBe('USD');
    });

    it('clears the price on update by sending null when the field is emptied', async () => {
      updated.mockResolvedValueOnce({ id: 'wo1' });
      render(
        <WorkOrderForm
          clients={clients}
          workOrder={{
            id: 'wo1',
            clientId: 'c1',
            title: 'Fix',
            status: WorkOrderStatus.OPEN,
            priority: WorkOrderPriority.HIGH,
            totalPriceMinor: 1000,
            currency: Currency.ARS,
            createdAt: now,
            updatedAt: now,
          }}
          onSaved={() => {}}
          onCancel={() => {}}
        />,
      );
      fireEvent.change(screen.getByLabelText(/precio total/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
      await waitFor(() => expect(updated).toHaveBeenCalled());
      const payload = updated.mock.calls[0][1];
      expect(payload.totalPriceMinor).toBeNull();
      expect(payload).not.toHaveProperty('currency');
    });

    it('maps server field errors to the price inputs', async () => {
      created.mockRejectedValueOnce(
        new ApiRequestError('VALIDATION_ERROR', { currency: 'currency is required' }),
      );
      render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/precio total/i), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: 'ARS' } });
      submitCreate();
      expect(await screen.findByText(/elegí la moneda/i)).toBeInTheDocument();
      expect(screen.queryByText(/no se pudo guardar/i)).not.toBeInTheDocument();
    });
  });
});
