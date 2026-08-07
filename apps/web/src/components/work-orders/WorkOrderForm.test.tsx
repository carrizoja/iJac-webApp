import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkOrderForm } from './WorkOrderForm';
import type { Client, WorkOrderClientSummary } from '@ijac/shared';
import { WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';

vi.mock('../../lib/resources', () => ({
  createWorkOrder: vi.fn(),
  updateWorkOrder: vi.fn(),
}));

import { createWorkOrder, updateWorkOrder } from '../../lib/resources';

describe('WorkOrderForm', () => {
  const now = new Date().toISOString();
  const clients: Client[] = [
    { id: 'c1', name: 'Acme', email: 'a@a.com', phone: '1', organization: '', notes: '', workOrderCount: 0, createdAt: now, updatedAt: now },
  ];

  it('shows validation errors for empty required fields', async () => {
    render(<WorkOrderForm clients={clients} onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(screen.getByText(/título es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/cliente es obligatorio/i)).toBeInTheDocument();
    });
  });

  it('calls createWorkOrder with selected client and status', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockResolvedValueOnce({ id: 'wo1' });
    render(<WorkOrderForm clients={clients} onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Reparar red' } });
    fireEvent.change(screen.getByLabelText(/cliente/i), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText(/estado/i), { target: { value: 'in-progress' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Reparar red', clientId: 'c1', status: 'in-progress' }),
      );
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
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(screen.getByText('Failed to create work order')).toBeInTheDocument();
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
    const existingWO: WorkOrderClientSummary = {
      id: 'wo1',
      clientId: 'c1',
      clientName: 'Acme',
      title: 'Fix network',
      status: WorkOrderStatus.OPEN,
      priority: WorkOrderPriority.HIGH,
      dueDate: '2025-01-20',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockedUpdate = updateWorkOrder as unknown as ReturnType<typeof vi.fn>;
    mockedUpdate.mockResolvedValueOnce(existingWO);

    render(<WorkOrderForm clients={clients} workOrder={existingWO} onSaved={onSaved} onCancel={() => {}} />);

    // Form should be pre-populated
    expect((screen.getByLabelText(/título/i) as HTMLInputElement).value).toBe('Fix network');
    expect((screen.getByLabelText(/estado/i) as HTMLSelectElement).value).toBe('open');

    // Change title and submit
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Fix network - URGENT' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('wo1', expect.objectContaining({ title: 'Fix network - URGENT' }));
      expect(onSaved).toHaveBeenCalled();
    });
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
});
