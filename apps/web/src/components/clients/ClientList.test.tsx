import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Cliente' }));

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
    expect(screen.getByTestId('delete-confirmation')).toHaveTextContent('¿Eliminar cliente "Acme Inc"?');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('shows request errors as an actionable alert', async () => {
    listClients.mockRejectedValueOnce(new Error('No se pudo cargar'));
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo cargar');
    expect(screen.getByRole('button', { name: 'Dismiss alert' })).toBeInTheDocument();
  });

  it('renders table mode by default, preserves search and records when switching to cards, and supports actions', async () => {
    const onEdit = vi.fn();
    listClients.mockResolvedValue({ items: [client] });
    render(<ClientList onCreate={vi.fn()} onEdit={onEdit} />);

    await waitFor(() => expect(screen.getByText('Acme Inc')).toBeInTheDocument());
    expect(screen.getByTestId('client-table')).toBeInTheDocument();
    expect(screen.getByTestId('client-table-container')).toBeInTheDocument();
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
    expect(screen.getByTestId('delete-confirmation')).toHaveTextContent('¿Eliminar cliente "Acme Inc"?');
  });
});
