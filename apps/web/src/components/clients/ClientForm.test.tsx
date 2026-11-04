import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientForm } from './ClientForm';
import type { Client } from '@ijac/shared';

vi.mock('../../lib/resources', () => {
  class ApiRequestError extends Error {
    constructor(
      readonly code: string,
      readonly fieldErrors?: Record<string, string>,
    ) {
      super(code);
    }
  }
  return { ApiRequestError, createClient: vi.fn(), updateClient: vi.fn() };
});

import { ApiRequestError, createClient, updateClient } from '../../lib/resources';

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

  describe('tax ID', () => {
    const fillRequired = () => {
      fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Acme' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'acme@example.com' } });
      fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '123' } });
    };

    it('renders an optional CUIT/DNI input with helper text', () => {
      render(<ClientForm onSaved={() => {}} onCancel={() => {}} />);
      const input = screen.getByLabelText(/cuit\/dni/i);
      expect(input).not.toBeRequired();
      expect(screen.getByText(/entre 7 y 11 dígitos/i)).toBeInTheDocument();
    });

    it('submits a valid CUIT as typed', async () => {
      const mockedCreate = vi.mocked(createClient);
      mockedCreate.mockResolvedValueOnce({ id: '1' } as Client);
      render(<ClientForm onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/cuit\/dni/i), {
        target: { value: '20-12345678-6' },
      });
      fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
      await waitFor(() => {
        expect(mockedCreate).toHaveBeenCalledWith(
          expect.objectContaining({ taxId: '20-12345678-6' }),
        );
      });
    });

    it('blocks submit and shows a field error for an invalid tax ID', async () => {
      const mockedCreate = vi.mocked(createClient);
      mockedCreate.mockClear();
      render(<ClientForm onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/cuit\/dni/i), { target: { value: '12AB5678' } });
      fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
      await waitFor(() => {
        expect(screen.getByText(/cuit o dni no es válido/i)).toBeInTheDocument();
      });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('prefills the stored tax ID and sends an empty value to clear it', async () => {
      const mockedUpdate = vi.mocked(updateClient);
      mockedUpdate.mockResolvedValueOnce({ id: 'c1' } as Client);
      const existing = {
        id: 'c1',
        name: 'Acme',
        email: 'acme@example.com',
        phone: '123',
        taxId: '12345678',
      } as Client;
      render(<ClientForm client={existing} onSaved={() => {}} onCancel={() => {}} />);
      const input = screen.getByLabelText(/cuit\/dni/i);
      expect(input).toHaveValue('12345678');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
      await waitFor(() => {
        expect(mockedUpdate).toHaveBeenCalledWith('c1', expect.objectContaining({ taxId: '' }));
      });
    });

    it('maps a server field error on taxId to the input', async () => {
      vi.mocked(createClient).mockRejectedValueOnce(
        new ApiRequestError('VALIDATION_ERROR', { taxId: 'taxId must be valid' }),
      );
      render(<ClientForm onSaved={() => {}} onCancel={() => {}} />);
      fillRequired();
      fireEvent.change(screen.getByLabelText(/cuit\/dni/i), { target: { value: '12345678' } });
      fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
      await waitFor(() => {
        expect(screen.getByText(/cuit o dni no es válido/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/no se pudo guardar el cliente/i)).not.toBeInTheDocument();
    });
  });
});
