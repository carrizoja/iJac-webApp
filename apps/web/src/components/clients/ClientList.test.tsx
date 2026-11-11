import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Client, WorkOrderClientSummary } from '@ijac/shared';
import { Currency, WorkOrderPriority, WorkOrderStatus, formatMoney } from '@ijac/shared';

const { listClients, deleteClient, listWorkOrders, ApiRequestError } = vi.hoisted(() => ({
  listClients: vi.fn(),
  deleteClient: vi.fn(),
  listWorkOrders: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
}));

vi.mock('../../lib/resources', () => ({
  listClients,
  deleteClient,
  listWorkOrders,
  ApiRequestError,
}));

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
    listWorkOrders.mockResolvedValue({ items: [] });
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

  describe.each(['table', 'cards'] as const)(
    'keyboard focus through an inline delete (%s)',
    (view) => {
      async function openConfirmation(items: Client[]) {
        listClients.mockResolvedValue({ items });
        render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
        await screen.findByText('Acme Inc');
        if (view === 'cards') fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
        fireEvent.click(screen.getByRole('button', { name: 'Eliminar Acme Inc' }));
      }

      it('moves focus to Cancelar when the confirmation opens, and back to Eliminar on cancel', async () => {
        await openConfirmation([client]);

        const cancel = within(screen.getByTestId('delete-confirmation')).getByRole('button', {
          name: 'Cancelar',
        });
        expect(cancel).toHaveFocus();

        fireEvent.click(cancel);
        expect(screen.getByRole('button', { name: 'Eliminar Acme Inc' })).toHaveFocus();
      });

      it('moves focus to the next client once the delete succeeds', async () => {
        deleteClient.mockResolvedValue(undefined);
        await openConfirmation([client, secondClient]);
        listClients.mockResolvedValue({ items: [secondClient] });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Eliminar Beta LLC' })).toHaveFocus(),
        );
        expect(deleteClient).toHaveBeenCalledWith('client-1');
      });

      it('moves focus to the client above when the bottom one is deleted', async () => {
        deleteClient.mockResolvedValue(undefined);
        listClients.mockResolvedValue({ items: [client, secondClient] });
        render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);
        await screen.findByText('Acme Inc');
        if (view === 'cards') fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
        const rowDeletes = screen
          .getAllByRole('button', { name: /^Eliminar / })
          .map((button) => button.getAttribute('aria-label'));
        const bottom = rowDeletes[rowDeletes.length - 1]!;
        const above = rowDeletes[rowDeletes.length - 2]!;
        fireEvent.click(screen.getByRole('button', { name: bottom }));
        listClients.mockResolvedValue({
          items: [client, secondClient].filter((c) => `Eliminar ${c.name}` !== bottom),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => expect(screen.getByRole('button', { name: above })).toHaveFocus());
      });

      it('moves focus to Nuevo cliente when the last client is deleted', async () => {
        deleteClient.mockResolvedValue(undefined);
        await openConfirmation([client]);
        listClients.mockResolvedValue({ items: [] });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toHaveFocus(),
        );
      });

      it('keeps focus on the confirmation when the delete fails', async () => {
        deleteClient.mockRejectedValue(new Error('network'));
        await openConfirmation([client]);

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        await screen.findByRole('alert');
        expect(
          within(screen.getByTestId('delete-confirmation')).getByRole('button', {
            name: 'Eliminar',
          }),
        ).toHaveFocus();
      });
    },
  );

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

  describe("a client's orders and balance", () => {
    const owing: WorkOrderClientSummary = {
      id: 'wo-1',
      title: 'Reparación',
      clientId: 'client-1',
      clientName: 'Acme Inc',
      status: WorkOrderStatus.OPEN,
      priority: WorkOrderPriority.NORMAL,
      currency: Currency.ARS,
      totalPriceMinor: 150000,
      remainingMinor: 100000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const withOrders: Client = { ...client, workOrderCount: 3 };
    const oneOrder: Client = { ...secondClient, workOrderCount: 1 };
    const balance = formatMoney(100000, Currency.ARS);

    it('links each client to its orders, and to what it owes, in table and card views', async () => {
      listClients.mockResolvedValue({ items: [withOrders, oneOrder] });
      listWorkOrders.mockResolvedValue({ items: [owing] });
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      for (const view of ['table', 'cards']) {
        if (view === 'cards') fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
        const orders = await screen.findByRole('link', { name: '3 órdenes de Acme Inc' });
        expect(orders).toHaveTextContent('3 órdenes');
        expect(orders).toHaveAttribute('href', '/work-orders?client=client-1');
        const owed = await screen.findByRole('link', { name: `Saldo ${balance} de Acme Inc` });
        expect(owed).toHaveTextContent(`Saldo ${balance}`);
        expect(owed).toHaveAttribute('href', '/work-orders?client=client-1&balance=owed');
        expect(screen.getByRole('link', { name: '1 orden de Beta LLC' })).toHaveAttribute(
          'href',
          '/work-orders?client=client-2',
        );
        expect(screen.queryByRole('link', { name: /^Saldo .* de Beta LLC$/ })).toBeNull();
      }
      // One load of every order, for all clients.
      expect(listWorkOrders).toHaveBeenCalledTimes(1);
    });

    it('says Sin órdenes, without a link, for a client with none', async () => {
      listClients.mockResolvedValue({ items: [client] });
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      const row = (await screen.findByText('Acme Inc')).closest('tr')!;
      expect(within(row).getByText('Sin órdenes')).toBeInTheDocument();
      // The name links to the client's page; the orders cell has no link.
      expect(
        within(row)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['Acme Inc']);
    });

    it('adds up a balance owed in two currencies', async () => {
      listClients.mockResolvedValue({ items: [withOrders] });
      listWorkOrders.mockResolvedValue({
        items: [
          owing,
          {
            ...owing,
            id: 'wo-2',
            currency: Currency.USD,
            totalPriceMinor: 5000,
            remainingMinor: 2000,
          },
        ],
      });
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      const both = `Saldo ${balance} · ${formatMoney(2000, Currency.USD)}`;
      expect(await screen.findByRole('link', { name: `${both} de Acme Inc` })).toHaveTextContent(
        both,
      );
    });

    it('still links to the orders when the balances cannot be loaded', async () => {
      listClients.mockResolvedValue({ items: [withOrders] });
      listWorkOrders.mockRejectedValue(new Error('offline'));
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      expect(
        await screen.findByRole('link', { name: '3 órdenes de Acme Inc' }),
      ).toBeInTheDocument();
      await waitFor(() => expect(listWorkOrders).toHaveBeenCalled());
      expect(screen.queryByRole('link', { name: /^Saldo/ })).toBeNull();
    });
  });

  it('links each client name to its page, in table and card views', async () => {
    listClients.mockResolvedValue({ items: [client] });
    render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

    expect(await screen.findByRole('link', { name: 'Acme Inc' })).toHaveAttribute(
      'href',
      '/clients/details?id=client-1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
    expect(screen.getByRole('link', { name: 'Acme Inc' })).toHaveAttribute(
      'href',
      '/clients/details?id=client-1',
    );
  });

  describe('a client that has orders', () => {
    const busy: Client = { ...client, id: 'busy', name: 'Con órdenes', workOrderCount: 2 };
    const free: Client = { ...secondClient, id: 'free', name: 'Sin órdenes aún' };
    const blockedName = 'No se puede eliminar Con órdenes: tiene órdenes de trabajo.';
    const reason = 'No se puede eliminar un cliente que tiene órdenes de trabajo.';

    it('does not offer to delete it, in table and card views, but keeps the button reachable', async () => {
      listClients.mockResolvedValue({ items: [busy, free] });
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      const expectBlocked = (button: HTMLElement) => {
        expect(button).toHaveAttribute('aria-disabled', 'true');
        expect(button).not.toBeDisabled();
        expect(button).toHaveAttribute('title', reason);
        button.focus();
        expect(button).toHaveFocus();
      };
      expectBlocked(await screen.findByRole('button', { name: blockedName }));
      expect(screen.getByRole('button', { name: 'Eliminar Sin órdenes aún' })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
      expectBlocked(screen.getByRole('button', { name: blockedName }));
      expect(screen.getByRole('button', { name: 'Eliminar Sin órdenes aún' })).toBeEnabled();
    });

    it('says why on tap and links to its orders, in table and card views', async () => {
      listClients.mockResolvedValue({ items: [busy] });
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      const expectNoteOnTap = (button: HTMLElement) => {
        expect(screen.queryByTestId('client-delete-blocked')).not.toBeInTheDocument();
        fireEvent.click(button);
        // No delete confirmation opens.
        expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
        const note = screen.getByTestId('client-delete-blocked');
        expect(within(note).getByRole('status')).toHaveTextContent(reason);
        expect(within(note).getByRole('link', { name: 'Ver sus órdenes' })).toHaveAttribute(
          'href',
          '/work-orders?client=busy',
        );
        fireEvent.click(within(note).getByRole('button', { name: 'Entendido' }));
        expect(screen.queryByTestId('client-delete-blocked')).not.toBeInTheDocument();
        expect(button).toHaveFocus();
      };

      expectNoteOnTap(await screen.findByRole('button', { name: blockedName }));
      fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }));
      expectNoteOnTap(screen.getByRole('button', { name: blockedName }));
      expect(deleteClient).not.toHaveBeenCalled();
    });

    it('explains a refusal from the server instead of asking to try again', async () => {
      // The list said no orders, but one was added since: the API refuses with a conflict.
      listClients.mockResolvedValue({ items: [client] });
      deleteClient.mockRejectedValue(new ApiRequestError('CONFLICT'));
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Acme Inc' }));
      fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

      expect(await screen.findByText(reason)).toBeInTheDocument();
      expect(
        screen.queryByText('No se pudo eliminar el cliente. Intentá nuevamente.'),
      ).not.toBeInTheDocument();
    });

    it('keeps the generic error for other failures', async () => {
      listClients.mockResolvedValue({ items: [client] });
      deleteClient.mockRejectedValue(new Error('offline'));
      render(<ClientList onCreate={vi.fn()} onEdit={vi.fn()} />);

      fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Acme Inc' }));
      fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

      expect(
        await screen.findByText('No se pudo eliminar el cliente. Intentá nuevamente.'),
      ).toBeInTheDocument();
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
