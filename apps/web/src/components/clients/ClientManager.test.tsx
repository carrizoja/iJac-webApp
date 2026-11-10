import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Client } from '@ijac/shared';

vi.mock('./ClientList', () => ({
  ClientList: ({
    onCreate,
    onEdit,
  }: {
    onCreate: () => void;
    onEdit: (client: Client) => void;
  }) => (
    <div>
      <button onClick={onCreate}>Nuevo cliente</button>
      <button
        onClick={() =>
          onEdit({ id: 'client-1', name: 'Acme', email: 'a@acme.test', phone: '1' } as Client)
        }
      >
        Editar Acme
      </button>
      <button
        onClick={() =>
          onEdit({ id: 'client-2', name: 'Beta', email: 'b@beta.test', phone: '2' } as Client)
        }
      >
        Editar Beta
      </button>
    </div>
  ),
}));

// Like the real form, it copies the client into state once, when it mounts.
vi.mock('./ClientForm', async () => {
  const { useState } = await import('react');
  return {
    ClientForm: ({
      client,
      onSaved,
      onCancel,
    }: {
      client?: Client;
      onSaved: (saved: Client) => void;
      onCancel: () => void;
    }) => {
      const [name] = useState(client?.name ?? '');
      return (
        <div>
          <p data-testid="form-client-name">{name}</p>
          <button onClick={onCancel}>Cancelar formulario</button>
          <button
            onClick={() =>
              onSaved({
                ...(client ?? { id: 'client-new' }),
                name: client?.name ?? 'Nuevo SA',
              } as Client)
            }
          >
            Guardar formulario
          </button>
        </div>
      );
    },
  };
});

import { ClientManager } from './ClientManager';

describe('ClientManager', () => {
  it('confirms a new client by name and puts focus on the confirmation', async () => {
    render(<ClientManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar formulario' }));

    const notice = screen.getByTestId('client-saved');
    expect(within(notice).getByRole('status')).toHaveTextContent('Cliente creado · Nuevo SA');
    expect(screen.queryByTestId('client-form-panel')).not.toBeInTheDocument();
    await waitFor(() => expect(notice).toHaveFocus());
  });

  it('confirms an edit, and clears the confirmation when another form opens', () => {
    render(<ClientManager />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar formulario' }));

    expect(within(screen.getByTestId('client-saved')).getByRole('status')).toHaveTextContent(
      'Cliente guardado · Acme',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar Beta' }));
    expect(screen.queryByTestId('client-saved')).not.toBeInTheDocument();
  });

  it('shows the editorial form panel for create and edit flows', () => {
    render(<ClientManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    expect(screen.getByTestId('client-form-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo cliente' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar formulario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme' }));
    expect(screen.getByText('Editar cliente')).toBeInTheDocument();
  });

  it('starts the form from the client just chosen when switching to another', () => {
    render(<ClientManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme' }));
    expect(screen.getByTestId('form-client-name')).toHaveTextContent('Acme');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Beta' }));
    expect(screen.getByTestId('form-client-name')).toHaveTextContent('Beta');
  });

  describe('bringing the form into view', () => {
    const originalScroll = Element.prototype.scrollIntoView;
    afterEach(() => {
      Element.prototype.scrollIntoView = originalScroll;
    });

    it('scrolls to and focuses the form heading on edit, and returns focus on cancel', () => {
      const scroll = vi.fn();
      Element.prototype.scrollIntoView = scroll;
      render(<ClientManager />);

      const edit = screen.getByRole('button', { name: 'Editar Acme' });
      edit.focus();
      fireEvent.click(edit);

      const heading = screen.getByRole('heading', { name: 'Editar cliente' });
      expect(heading).toHaveFocus();
      expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
      expect(scroll.mock.contexts[0]).toBe(screen.getByTestId('client-form-panel'));

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar formulario' }));
      expect(edit).toHaveFocus();
    });
  });
});
