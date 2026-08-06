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
});
