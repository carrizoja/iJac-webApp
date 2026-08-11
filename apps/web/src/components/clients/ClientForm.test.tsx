import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientForm } from './ClientForm';
import type { Client } from '@ijac/shared';

vi.mock('../../lib/resources', () => ({
  createClient: vi.fn(),
  updateClient: vi.fn(),
}));

import { createClient, updateClient } from '../../lib/resources';

describe('ClientForm', () => {
  it('shows validation errors for empty required fields', async () => {
    render(<ClientForm onSaved={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
    await waitFor(() => {
      expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/email es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/teléfono es obligatorio/i)).toBeInTheDocument();
    });
  });

  it('calls createClient with valid data', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockResolvedValueOnce({ id: '1' } as Client);
    render(<ClientForm onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'acme@example.com' } });
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme', email: 'acme@example.com', phone: '123' }),
      );
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('shows pending state (disabled button) while submitting', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
    // Simulate a slow create operation
    mockedCreate.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ id: '1' } as Client), 100);
        }),
    );
    render(<ClientForm onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'acme@example.com' } });
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '123' } });

    const submitButton = screen.getByRole('button', { name: /crear cliente/i });
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // After submission completes, onSaved should be called
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('displays API error message in general error field', async () => {
    const onSaved = vi.fn();
    const mockedCreate = createClient as unknown as ReturnType<typeof vi.fn>;
    mockedCreate.mockRejectedValueOnce(new Error('Server error'));
    render(<ClientForm onSaved={onSaved} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'acme@example.com' } });
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
    await waitFor(() => {
      expect(
        screen.getByText('No se pudo guardar el cliente. Intentá nuevamente.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Server error')).not.toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ClientForm onSaved={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('preserves form data for editing and updates existing client', async () => {
    const onSaved = vi.fn();
    const existingClient: Client = {
      id: 'c1',
      name: 'Acme Inc',
      email: 'acme@example.com',
      phone: '555-1234',
      organization: 'iJac',
      notes: 'Test client',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workOrderCount: 0,
    };
    const mockedUpdate = updateClient as unknown as ReturnType<typeof vi.fn>;
    mockedUpdate.mockResolvedValueOnce(existingClient);

    render(<ClientForm client={existingClient} onSaved={onSaved} onCancel={() => {}} />);

    // Form should be pre-populated
    expect((screen.getByLabelText(/nombre/i) as HTMLInputElement).value).toBe('Acme Inc');
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('acme@example.com');

    // Change name and submit
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Acme Inc Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ name: 'Acme Inc Updated' }),
      );
      expect(onSaved).toHaveBeenCalled();
    });
  });
});
