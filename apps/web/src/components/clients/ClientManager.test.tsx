import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Client } from '@ijac/shared';

vi.mock('./ClientList', () => ({
  ClientList: ({ onCreate, onEdit }: { onCreate: () => void; onEdit: (client: Client) => void }) => (
    <div>
      <button onClick={onCreate}>Nuevo cliente</button>
      <button onClick={() => onEdit({ id: 'client-1', name: 'Acme', email: 'a@acme.test', phone: '1' } as Client)}>
        Editar Acme
      </button>
    </div>
  ),
}));

vi.mock('./ClientForm', () => ({
  ClientForm: ({ onCancel }: { onCancel: () => void }) => <button onClick={onCancel}>Cancelar formulario</button>,
}));

import { ClientManager } from './ClientManager';

describe('ClientManager', () => {
  it('shows the editorial form panel for create and edit flows', () => {
    render(<ClientManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    expect(screen.getByTestId('client-form-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo cliente' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar formulario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme' }));
    expect(screen.getByText('Editar cliente')).toBeInTheDocument();
  });
});
