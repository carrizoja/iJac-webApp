import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Client } from '@ijac/shared';

const { listClients, deleteClient } = vi.hoisted(() => ({
  listClients: vi.fn(),
  deleteClient: vi.fn(),
}));

vi.mock('../../lib/resources', () => ({ listClients, deleteClient }));

import { ClientList } from './ClientList';

const client: Client = {
  id: 'client-1',
  name: 'Acme Inc',
  email: 'acme@example.com',
  phone: '555-0100',
  organization: 'Acme',
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workOrderCount: 0,
};

const secondClient: Client = {
  ...client,
  id: 'client-2',
  name: 'Beta LLC',
  email: 'beta@example.com',
  organization: 'Beta',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('ClientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    listClients.mockResolvedValue({ items: [] });
    deleteClient.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps search available while the results region initially loads', () => {
    listClients.mockReturnValue(new Promise(() => {}));

    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByPlaceholderText('Buscar clientes...')).toBeInTheDocument();
    expect(screen.getByTestId('client-list')).toBeInTheDocument();
    expect(screen.getByTestId('clients-loading-state')).toBeInTheDocument();
    expect(screen.getByText('Cargando clientes...')).toBeInTheDocument();
  });

  it('keeps focus and requests only the latest term after the debounce', async () => {
    vi.useFakeTimers();
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
    await act(async () => Promise.resolve());
    const searchInput = screen.getByPlaceholderText('Buscar clientes...');

    searchInput.focus();
    fireEvent.change(searchInput, { target: { value: 'A' } });
    fireEvent.change(searchInput, { target: { value: 'Ac' } });
    fireEvent.change(searchInput, { target: { value: 'Acme' } });

    expect(searchInput).toHaveFocus();
    expect(searchInput).toHaveValue('Acme');
    expect(listClients).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(listClients).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(listClients).toHaveBeenCalledTimes(2);
    expect(listClients).toHaveBeenLastCalledWith({ search: 'Acme' });
    expect(searchInput).toHaveFocus();
  });

  it('preserves results and ignores an older response during background search', async () => {
    vi.useFakeTimers();
    const olderSearch = deferred<{ items: Client[] }>();
    const latestSearch = deferred<{ items: Client[] }>();
    listClients
      .mockResolvedValueOnce({ items: [client] })
      .mockReturnValueOnce(olderSearch.promise)
      .mockReturnValueOnce(latestSearch.promise);
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
    await act(async () => Promise.resolve());
    const searchInput = screen.getByPlaceholderText('Buscar clientes...');

    searchInput.focus();
    fireEvent.change(searchInput, { target: { value: 'Ac' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Buscando clientes...');
    expect(searchInput).toHaveFocus();

    fireEvent.change(searchInput, { target: { value: 'Beta' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await act(async () => latestSearch.resolve({ items: [secondClient] }));

    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => olderSearch.resolve({ items: [client] }));
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    expect(screen.queryByText('Acme Inc')).not.toBeInTheDocument();
  });

  it('ignores an error from an older search request', async () => {
    vi.useFakeTimers();
    const olderSearch = deferred<{ items: Client[] }>();
    listClients
      .mockResolvedValueOnce({ items: [client] })
      .mockReturnValueOnce(olderSearch.promise)
      .mockResolvedValueOnce({ items: [secondClient] });
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
    await act(async () => Promise.resolve());
    const searchInput = screen.getByPlaceholderText('Buscar clientes...');

    fireEvent.change(searchInput, { target: { value: 'Ac' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.change(searchInput, { target: { value: 'Beta' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await act(async () => Promise.resolve());

    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    await act(async () => olderSearch.reject(new Error('Old request failed')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('invalidates a pending response as soon as the input term changes', async () => {
    vi.useFakeTimers();
    const pendingSearch = deferred<{ items: Client[] }>();
    listClients
      .mockResolvedValueOnce({ items: [client] })
      .mockReturnValueOnce(pendingSearch.promise);
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
    await act(async () => Promise.resolve());
    const searchInput = screen.getByPlaceholderText('Buscar clientes...');

    fireEvent.change(searchInput, { target: { value: 'Ac' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.change(searchInput, { target: { value: 'Beta' } });
    await act(async () => pendingSearch.resolve({ items: [secondClient] }));

    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.queryByText('Beta LLC')).not.toBeInTheDocument();
  });

  it('renders empty state and create action after loading', async () => {
    const onCreate = vi.fn();
    render(<ClientList onCreate={onCreate} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('No hay clientes')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(screen.getByTestId('client-list')).toBeInTheDocument();
  });

  it('preserves edit and delete actions with accessible names', async () => {
    const onEdit = vi.fn();
    listClients.mockResolvedValue({ items: [client] });
    render(<ClientList onCreate={vi.fn()} onEdit={onEdit} />);

    await waitFor(() => expect(screen.getByText('Acme Inc')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme Inc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Acme Inc' }));

    expect(onEdit).toHaveBeenCalledWith(client);
    expect(screen.getByTestId('delete-confirmation')).toHaveTextContent(
      '¿Eliminar cliente "Acme Inc"?',
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('loads the clients again when Reintentar is pressed after a failure', async () => {
    listClients.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
    listClients.mockResolvedValue({ items: [client] });
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

    const alert = await screen.findByRole('alert');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Acme Inc')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows request errors as an actionable alert', async () => {
    listClients.mockRejectedValueOnce(new Error('No se pudo cargar'));
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron cargar los clientes.');
    expect(alert).not.toHaveTextContent('Old request failed');
    expect(screen.getByRole('button', { name: 'Cerrar alerta' })).toBeInTheDocument();
  });

  it('renders table mode by default, preserves search and records when switching to cards, and supports actions', async () => {
    const onEdit = vi.fn();
    listClients.mockResolvedValue({ items: [client] });
    render(<ClientList onCreate={vi.fn()} onEdit={onEdit} />);

    await waitFor(() => expect(screen.getByText('Acme Inc')).toBeInTheDocument());
    expect(screen.getByTestId('client-table')).toBeInTheDocument();
    const scroller = screen.getByRole('region', { name: 'Lista de clientes' });
    expect(scroller).toBe(screen.getByTestId('client-table-container'));
    expect(scroller).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Teléfono' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Organización' })).toBeInTheDocument();

    const initialFetchCount = listClients.mock.calls.length;

    const cardsToggleBtn = screen.getByRole('button', { name: 'Tarjetas' });
    fireEvent.click(cardsToggleBtn);

    expect(screen.queryByTestId('client-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('client-cards')).toBeInTheDocument();
    expect(listClients.mock.calls.length).toBe(initialFetchCount);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Acme Inc' }));
    expect(onEdit).toHaveBeenCalledWith(client);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Acme Inc' }));
    expect(screen.getByTestId('delete-confirmation')).toHaveTextContent(
      '¿Eliminar cliente "Acme Inc"?',
    );
  });

  it('shows the tax ID in table and card modes only when present', async () => {
    listClients.mockResolvedValue({
      items: [{ ...client, taxId: '20123456786' }, secondClient],
    });
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Acme Inc')).toBeInTheDocument());
    expect(screen.getAllByText(/20123456786/)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
    expect(screen.getAllByText(/20123456786/)).toHaveLength(1);
  });

  describe('sorting and row actions', () => {
    const clients: Client[] = [
      {
        ...client,
        id: 'old',
        name: 'Bravo',
        createdAt: '2026-01-10T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z',
      },
      { ...client, id: 'new', name: 'Charlie', createdAt: '2026-11-01T00:00:00.000Z' },
      { ...client, id: 'mid', name: 'Alfa', createdAt: '2026-06-01T00:00:00.000Z' },
    ];

    const rowNames = () =>
      within(screen.getByTestId('client-table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.querySelector('td')?.textContent);

    it('shows the newest created client first by default', async () => {
      listClients.mockResolvedValue({ items: clients });
      render(<ClientList />);

      await waitFor(() => expect(rowNames()).toEqual(['Charlie', 'Alfa', 'Bravo']));
    });

    it('sorts by a column header: ascending, descending, then back to newest first', async () => {
      listClients.mockResolvedValue({ items: clients });
      render(<ClientList />);
      await screen.findByText('Charlie');

      const nameHeader = screen.getByRole('columnheader', { name: /Nombre/ });
      fireEvent.click(within(nameHeader).getByRole('button'));
      expect(rowNames()).toEqual(['Alfa', 'Bravo', 'Charlie']);
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

      fireEvent.click(within(nameHeader).getByRole('button'));
      expect(rowNames()).toEqual(['Charlie', 'Bravo', 'Alfa']);

      fireEvent.click(within(nameHeader).getByRole('button'));
      expect(rowNames()).toEqual(['Charlie', 'Alfa', 'Bravo']);
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('remembers the chosen sort for the next visit', async () => {
      listClients.mockResolvedValue({ items: clients });
      const { unmount } = render(<ClientList />);
      await screen.findByText('Charlie');
      fireEvent.click(
        within(screen.getByRole('columnheader', { name: /Nombre/ })).getByRole('button'),
      );
      unmount();

      render(<ClientList />);
      await waitFor(() => expect(rowNames()).toEqual(['Alfa', 'Bravo', 'Charlie']));
    });

    it('sorts the card view with the sort selector', async () => {
      listClients.mockResolvedValue({ items: clients });
      render(<ClientList />);
      await screen.findByText('Charlie');
      fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));

      fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'name:asc' } });

      const cards = within(screen.getByTestId('client-cards'));
      const names = ['Alfa', 'Bravo', 'Charlie'].map((name) => cards.getByText(name));
      expect(
        names[0].compareDocumentPosition(names[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        names[1].compareDocumentPosition(names[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('loads every page of clients, not only the first one', async () => {
      listClients
        .mockResolvedValueOnce({ items: [clients[0]], nextCursor: 'old' })
        .mockResolvedValueOnce({ items: [clients[1], clients[2]] });
      render(<ClientList />);

      await waitFor(() => expect(rowNames()).toEqual(['Charlie', 'Alfa', 'Bravo']));
      expect(listClients).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'old' }));
    });

    it('shows edit and delete as icon buttons that appear on row hover', async () => {
      listClients.mockResolvedValue({ items: [client] });
      render(<ClientList />);
      await screen.findByText('Acme Inc');

      const edit = screen.getByRole('button', { name: 'Editar Acme Inc' });
      const remove = screen.getByRole('button', { name: 'Eliminar Acme Inc' });
      for (const button of [edit, remove]) {
        expect(button).toHaveTextContent('');
        expect(button.querySelector('svg')).not.toBeNull();
      }
      expect(edit).toHaveAttribute('title', 'Editar');
      expect(remove).toHaveAttribute('title', 'Eliminar');
      expect(screen.getByTestId('client-row-actions')).toHaveClass('row-actions');
    });
  });

  it('remembers the chosen view for the next visit', async () => {
    listClients.mockResolvedValue({ items: [client] });
    const first = render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tarjetas' }));
    first.unmount();

    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
    expect(await screen.findByTestId('client-cards')).toBeInTheDocument();
    expect(screen.queryByTestId('client-table')).not.toBeInTheDocument();
  });
});
