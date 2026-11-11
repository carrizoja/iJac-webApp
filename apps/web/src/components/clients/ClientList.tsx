import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Fragment,
  type MouseEvent,
} from 'react';
import type { Client } from '@ijac/shared';
import { formatMoney } from '@ijac/shared';
import { ApiRequestError, listClients, deleteClient, listWorkOrders } from '../../lib/resources';
import {
  Input,
  Button,
  buttonVariants,
  Alert,
  EmptyState,
  LoadingState,
  Panel,
  ViewModeToggle,
  SortableHeader,
  SortSelect,
  RowActionButton,
  type ViewMode,
} from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusAfterRender } from '../../hooks/useFocusAfterRender';
import type { TranslationKey } from '../../i18n/translations';
import { collectAllPages } from '../../lib/collectAllPages';
import { nextTableSort, readStoredTableSort, storeTableSort } from '../../lib/tableSort';
import { readViewMode, storeViewMode } from '../../lib/viewMode';
import {
  CLIENT_SORT_KEYS,
  DEFAULT_CLIENT_SORT,
  sortClients,
  type ClientSort,
  type ClientSortKey,
} from './clientSort';
import { owedByClient, type OwedAmount } from './clientBalance';
import { TriangleAlert, Users } from 'lucide-react';

const SORT_STORAGE_KEY = 'ijac.clients.sort';
const VIEW_STORAGE_KEY = 'ijac.clients.view';
const COLUMN_SORT_KEYS = ['name', 'email', 'phone', 'organization'] as const;
const NEW_BUTTON_ID = 'client-new';
const deleteButtonId = (id: string) => `client-delete-${id}`;
const deleteCancelId = (id: string) => `client-delete-cancel-${id}`;
const deleteConfirmId = (id: string) => `client-delete-confirm-${id}`;

const SORT_LABEL_KEYS: Record<ClientSortKey, TranslationKey> = {
  createdAt: 'clients.createdAt',
  name: 'clients.name',
  email: 'clients.email',
  phone: 'clients.phone',
  organization: 'clients.organization',
};

interface ClientListProps {
  onCreate?: () => void;
  onEdit?: (client: Client) => void;
  /** Called once a client is deleted, so a confirmation naming it can go. */
  onDeleted?: (id: string) => void;
}

export function ClientList({ onCreate, onEdit, onDeleted }: ClientListProps) {
  const { t } = useLanguage();
  const rowActionButtonClass = 'rounded-lg px-4';
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  // Read after mount: the server render cannot know the screen size or the stored view.
  useEffect(() => setViewMode(readViewMode(VIEW_STORAGE_KEY)), []);
  const changeViewMode = (next: ViewMode) => {
    setViewMode(next);
    storeViewMode(VIEW_STORAGE_KEY, next);
  };
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<string | null>(null);
  const blockedTrigger = useRef<HTMLButtonElement | null>(null);
  // The inline confirmation disables the row actions, so focus is moved on purpose at each step.
  const focusAfterRender = useFocusAfterRender();
  const openDelete = (id: string) => {
    setConfirmDelete(id);
    focusAfterRender(deleteCancelId(id));
  };
  const cancelDelete = (id: string) => {
    setConfirmDelete(null);
    focusAfterRender(deleteButtonId(id));
  };
  const [sort, setSort] = useState<ClientSort>(() =>
    readStoredTableSort(SORT_STORAGE_KEY, CLIENT_SORT_KEYS, DEFAULT_CLIENT_SORT),
  );
  const changeSort = (next: ClientSort) => {
    setSort(next);
    storeTableSort(SORT_STORAGE_KEY, next);
  };
  const sortedClients = useMemo(() => sortClients(clients, sort), [clients, sort]);
  const [owed, setOwed] = useState<Map<string, OwedAmount[]>>(() => new Map());
  // Balances come from the orders, loaded once. Without them the list still links to the orders.
  useEffect(() => {
    let active = true;
    collectAllPages((cursor) => listWorkOrders({ cursor }))
      .then((orders) => active && setOwed(owedByClient(orders)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const latestRequestId = useRef(0);
  const hasRequested = useRef(false);

  const load = useCallback(async (searchTerm: string, background = false) => {
    const requestId = ++latestRequestId.current;
    if (background) setSearching(true);
    setErrorKey(null);
    try {
      // The list is sorted in the browser, so it needs every page, not only the first.
      const items = await collectAllPages((cursor) => listClients({ search: searchTerm, cursor }));
      if (requestId !== latestRequestId.current) return;
      setClients(items);
    } catch {
      if (requestId !== latestRequestId.current) return;
      setErrorKey('clients.loadError');
    } finally {
      if (requestId === latestRequestId.current) {
        setInitialLoading(false);
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const background = hasRequested.current;
    hasRequested.current = true;
    void load(debouncedSearch, background);
  }, [debouncedSearch, load]);

  const handleDelete = async (id: string) => {
    const index = sortedClients.findIndex((client) => client.id === id);
    const neighbour = sortedClients[index + 1] ?? sortedClients[index - 1];
    setDeleting(id);
    try {
      await deleteClient(id);
      onDeleted?.(id);
      await load(debouncedSearch, true);
      setConfirmDelete(null);
      focusAfterRender(...(neighbour ? [deleteButtonId(neighbour.id)] : []), NEW_BUTTON_ID);
    } catch (error) {
      // The API refuses a client with orders (one may have been added since the list loaded).
      setErrorKey(
        error instanceof ApiRequestError && error.code === 'CONFLICT'
          ? 'clients.deleteHasOrders'
          : 'clients.deleteError',
      );
      focusAfterRender(deleteConfirmId(id));
    } finally {
      setDeleting(null);
    }
  };

  // A client with orders cannot be deleted; the button stays focusable and says why.
  const hasOrders = (client: Client) => client.workOrderCount > 0;
  const deleteLabel = (client: Client) =>
    t(hasOrders(client) ? 'clients.deleteBlockedNamed' : 'clients.deleteNamed', {
      name: client.name,
    });
  const showBlockedDelete = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    blockedTrigger.current = event.currentTarget;
    setBlockedDelete(id);
  };
  const dismissBlockedDelete = () => {
    setBlockedDelete(null);
    blockedTrigger.current?.focus();
  };
  const blockedDeleteNote = (client: Client) => (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      data-testid="client-delete-blocked"
    >
      <p role="status" className="text-sm text-fg-primary">
        {t('clients.deleteHasOrders')}
      </p>
      <div className="flex shrink-0 justify-end gap-2">
        <a
          href={`/work-orders?client=${encodeURIComponent(client.id)}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'rounded-lg' })}
        >
          {t('clients.viewOrders')}
        </a>
        <Button variant="secondary" size="sm" className="rounded-lg" onClick={dismissBlockedDelete}>
          {t('common.gotIt')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5" data-testid="client-list">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="search"
          type="search"
          value={search}
          onChange={(e) => {
            latestRequestId.current += 1;
            setSearching(false);
            setSearch(e.target.value);
          }}
          placeholder={t('clients.search')}
          className="w-full rounded-xl sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'cards' && (
            <SortSelect
              id="clientSort"
              label={t('clients.sortBy')}
              keys={CLIENT_SORT_KEYS}
              keyLabel={(key) => t(SORT_LABEL_KEYS[key])}
              sort={sort}
              defaultSort={DEFAULT_CLIENT_SORT}
              onChange={changeSort}
            />
          )}
          <ViewModeToggle
            value={viewMode}
            onChange={changeViewMode}
            ariaLabel={t('clients.view')}
          />
          <Button
            id={NEW_BUTTON_ID}
            onClick={onCreate}
            className="min-h-11 shrink-0 whitespace-nowrap rounded-xl px-6"
            variant="primary"
          >
            {t('clients.new')}
          </Button>
        </div>
      </div>

      {errorKey && (
        <Alert
          type="error"
          icon={<TriangleAlert aria-hidden="true" className="h-4 w-4" />}
          onClose={() => setErrorKey(null)}
          action={
            errorKey === 'clients.loadError'
              ? { label: t('common.retry'), onClick: () => void load(debouncedSearch, true) }
              : undefined
          }
        >
          {t(errorKey)}
        </Alert>
      )}

      {searching && !initialLoading && (
        <LoadingState
          role="status"
          aria-live="polite"
          size="sm"
          message={t('clients.searching')}
          className="flex-row justify-start py-1"
        />
      )}

      <div aria-busy={initialLoading || searching}>
        {initialLoading ? (
          <Panel className="clients-state-panel" data-testid="clients-loading-state">
            <LoadingState message={t('clients.loading')} />
          </Panel>
        ) : clients.length === 0 ? (
          <Panel className="clients-state-panel">
            <EmptyState
              icon={<Users aria-hidden="true" className="h-10 w-10" />}
              title={t('clients.emptyTitle')}
              description={t('clients.emptyDescription')}
            />
          </Panel>
        ) : viewMode === 'table' ? (
          // The table can be wider than the screen, so its box must be focusable to scroll by keyboard.
          <div
            className="w-full max-w-full overflow-x-auto rounded-xl border border-border-subtle bg-bg-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            data-testid="client-table-container"
            role="region"
            aria-label={t('clients.listCaption')}
            tabIndex={0}
          >
            <table className="w-full min-w-[760px] text-left text-sm" data-testid="client-table">
              <caption className="sr-only">{t('clients.listCaption')}</caption>
              <thead className="table-head border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <tr>
                  {COLUMN_SORT_KEYS.map((key) => (
                    <SortableHeader
                      key={key}
                      sortKey={key}
                      sort={sort}
                      onSort={(k) => changeSort(nextTableSort(sort, k, DEFAULT_CLIENT_SORT))}
                    >
                      {t(SORT_LABEL_KEYS[key])}
                    </SortableHeader>
                  ))}
                  <th scope="col" className="px-4 py-3">
                    {t('clients.orders')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
                {sortedClients.map((client) => (
                  <Fragment key={client.id}>
                    <tr className={confirmDelete === client.id ? 'bg-danger/5' : 'table-row'}>
                      <td className="px-4 py-3.5 font-medium">
                        {client.name}
                        {client.taxId && (
                          <span className="block text-xs font-normal text-fg-muted">
                            {t('clients.taxId')}: {client.taxId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-fg-muted">{client.email}</td>
                      <td className="px-4 py-3.5 text-fg-muted">{client.phone}</td>
                      <td className="px-4 py-3.5 text-fg-muted">{client.organization || '—'}</td>
                      <td className="px-4 py-3.5">
                        <ClientOrders client={client} owed={owed.get(client.id)} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div
                          className="row-actions inline-flex gap-2 justify-end"
                          data-testid="client-row-actions"
                        >
                          <RowActionButton
                            action="edit"
                            label={t('clients.editNamed', { name: client.name })}
                            title={t('common.edit')}
                            onClick={() => onEdit?.(client)}
                            disabled={confirmDelete !== null}
                          />
                          <RowActionButton
                            action="delete"
                            id={deleteButtonId(client.id)}
                            label={deleteLabel(client)}
                            title={t('common.delete')}
                            onClick={() => openDelete(client.id)}
                            disabled={confirmDelete !== null || deleting === client.id}
                            disabledReason={
                              hasOrders(client) ? t('clients.deleteHasOrders') : undefined
                            }
                            onBlockedClick={(event) => showBlockedDelete(client.id, event)}
                          />
                        </div>
                      </td>
                    </tr>
                    {blockedDelete === client.id && (
                      <tr key={`${client.id}-blocked`}>
                        <td colSpan={6} className="bg-bg-secondary px-4 py-3">
                          {blockedDeleteNote(client)}
                        </td>
                      </tr>
                    )}
                    {confirmDelete === client.id && (
                      <tr key={`${client.id}-delete`}>
                        <td
                          colSpan={6}
                          className="bg-danger/10 px-4 py-3"
                          data-testid="delete-confirmation"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-fg-primary">
                              {t('clients.confirmDelete', { name: client.name })}
                            </p>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => cancelDelete(client.id)}
                                id={deleteCancelId(client.id)}
                                disabled={deleting === client.id}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                variant="delete"
                                size="sm"
                                className={rowActionButtonClass}
                                onClick={() => handleDelete(client.id)}
                                id={deleteConfirmId(client.id)}
                                isLoading={deleting === client.id}
                              >
                                {t('common.delete')}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="client-cards">
            {sortedClients.map((client) => (
              <div key={client.id}>
                {blockedDelete === client.id && (
                  <Panel className="mb-3 border border-border-default">
                    {blockedDeleteNote(client)}
                  </Panel>
                )}
                {confirmDelete === client.id && (
                  <Panel
                    className="mb-3 border border-danger bg-danger/10"
                    data-testid="delete-confirmation"
                  >
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-fg-primary">
                        {t('clients.confirmDelete', { name: client.name })}
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => cancelDelete(client.id)}
                          id={deleteCancelId(client.id)}
                          disabled={deleting === client.id}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          variant="delete"
                          size="sm"
                          className={rowActionButtonClass}
                          onClick={() => handleDelete(client.id)}
                          id={deleteConfirmId(client.id)}
                          isLoading={deleting === client.id}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </Panel>
                )}
                <Panel
                  className={
                    confirmDelete === client.id
                      ? 'border border-border-subtle opacity-50'
                      : 'border border-border-subtle transition-colors hover:border-accent-brand/50'
                  }
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold text-fg-primary">
                        {client.name}
                      </h3>
                      <p className="text-sm text-fg-muted">{client.email}</p>
                      <p className="text-sm text-fg-muted">{client.phone}</p>
                      {client.organization && (
                        <p className="mt-1 text-xs text-fg-muted">{client.organization}</p>
                      )}
                      {client.taxId && (
                        <p className="mt-1 text-xs text-fg-muted">
                          {t('clients.taxId')}: {client.taxId}
                        </p>
                      )}
                      <div className="mt-3 text-sm">
                        <ClientOrders client={client} owed={owed.get(client.id)} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="edit"
                        size="sm"
                        className={rowActionButtonClass}
                        onClick={() => onEdit?.(client)}
                        disabled={confirmDelete !== null}
                        aria-label={t('clients.editNamed', { name: client.name })}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="delete"
                        size="sm"
                        className={rowActionButtonClass}
                        id={deleteButtonId(client.id)}
                        onClick={
                          hasOrders(client)
                            ? (event) => showBlockedDelete(client.id, event)
                            : () => openDelete(client.id)
                        }
                        disabled={confirmDelete !== null || deleting === client.id}
                        // A blocked delete stays focusable, so its reason can be reached.
                        aria-disabled={hasOrders(client) ? true : undefined}
                        title={hasOrders(client) ? t('clients.deleteHasOrders') : undefined}
                        aria-label={deleteLabel(client)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                </Panel>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const clientLinkClass =
  'rounded font-medium underline underline-offset-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** How many orders a client has and what it still owes, each linking to those orders. */
function ClientOrders({ client, owed }: { client: Client; owed?: OwedAmount[] }) {
  const { t } = useLanguage();
  if (client.workOrderCount === 0) {
    return <span className="text-fg-muted">{t('clients.noOrders')}</span>;
  }
  const ordersHref = `/work-orders?client=${encodeURIComponent(client.id)}`;
  const orders =
    client.workOrderCount === 1
      ? t('workOrders.resultCountOne')
      : t('workOrders.resultCount', { count: client.workOrderCount });
  const balance =
    owed && owed.length > 0
      ? t('workOrders.balanceDue', {
          value: owed.map((amount) => formatMoney(amount.minor, amount.currency)).join(' · '),
        })
      : null;
  return (
    <span className="flex flex-col items-start gap-0.5 tabular-nums">
      <a
        href={ordersHref}
        aria-label={t('clients.linkFor', { link: orders, name: client.name })}
        className={`${clientLinkClass} text-fg-secondary`}
      >
        {orders}
      </a>
      {balance && (
        <a
          href={`${ordersHref}&balance=owed`}
          aria-label={t('clients.linkFor', { link: balance, name: client.name })}
          className={`${clientLinkClass} text-xs font-semibold text-fg-primary`}
        >
          {balance}
        </a>
      )}
    </span>
  );
}
