import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkOrderForm } from './WorkOrderForm';
import type { Client } from '@ijac/shared';

vi.mock('../../lib/resources', () => ({
  createWorkOrder: vi.fn(),
  updateWorkOrder: vi.fn(),
}));

import { createWorkOrder, updateWorkOrder } from '../../lib/resources';

describe('WorkOrderForm', () => {
  const clients: Client[] = [
    { id: 'c1', name: 'Acme', email: 'a@a.com', phone: '1', workOrderCount: 0, createdAt: '', updatedAt: '' },
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
});
