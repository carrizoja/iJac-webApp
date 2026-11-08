import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { ApiRequestError, listWorkOrders, deleteWorkOrder } from '../../lib/resources';
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_PRIORITIES,
  PAYMENT_ERROR_CODES,
  formatMoney,
} from '@ijac/shared';
import {
  Input,
  Select,
  Button,
  Alert,
  EmptyState,
  LoadingState,
  Panel,
  Badge,
  ViewModeToggle,
  SortableHeader,
  SortSelect,
  RowActionButton,
  type ViewMode,
} from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, priorityLabel, statusLabel } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/translations';
import {
  DEFAULT_WORK_ORDER_SORT,
  WORK_ORDER_SORT_KEYS,
  nextWorkOrderSort,
  sortWorkOrders,
  type WorkOrderSort,
  type WorkOrderSortKey,
} from './workOrderSort';
import { collectAllPages } from '../../lib/collectAllPages';
import { readStoredTableSort, storeTableSort } from '../../lib/tableSort';
import { readViewMode, storeViewMode } from '../../lib/viewMode';
import { isOverdue, localDateKey } from '../home/todaySummary';
import { priorityBadgeClass, statusBadgeClass } from './workOrderBadges';
import { matchesOrderSearch } from './workOrderSearch';
import { ClipboardList, SlidersHorizontal, TriangleAlert } from 'lucide-react';

const SORT_STORAGE_KEY = 'ijac.workOrders.sort';
const VIEW_STORAGE_KEY = 'ijac.workOrders.view';
const COLUMN_SORT_KEYS = [
  'title',
  'client',
  'status',
  'priority',
  'dueDate',
  'totalPrice',
] as const;

const SORT_LABEL_KEYS: Record<WorkOrderSortKey, TranslationKey> = {
  createdAt: 'workOrders.createdAt',
  title: 'workOrders.title',
  client: 'workOrders.client',
  status: 'workOrders.status',
  priority: 'workOrders.priority',
  dueDate: 'workOrders.deadline',
  totalPrice: 'workOrders.totalPrice',
};

interface WorkOrderListProps {
  clients: Client[];
  onCreate?: () => void;
  onEdit?: (workOrder: WorkOrderClientSummary) => void;
}

function workOrderDetailsHref(id: string): string {
  return `/work-orders/details?id=${encodeURIComponent(id)}`;
}

function readUrlParam(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

/** A filter value from the page URL (e.g. `?status=open` from the home page), if it is a known one. */
function readUrlFilter(name: string, allowed: readonly string[]): string {
  const value = readUrlParam(name);
  return allowed.includes(value) ? value : '';
}

/** Writes the search and filters to the page URL, so a reload or Back keeps the same view. */
function writeUrlFilters(filters: Record<string, string>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(filters)) {
    if (value) params.set(name, value);
    else params.delete(name);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, '', next);
  }
}

export function WorkOrderList({ clients, onCreate, onEdit }: WorkOrderListProps) {
  const { language, t } = useLanguage();
  const rowActionButtonClass = 'rounded-lg px-4';
  const [workOrders, setWorkOrders] = useState<WorkOrderClientSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  // Read after mount: the server render cannot know the screen size or the stored view.
  useEffect(() => setViewMode(readViewMode(VIEW_STORAGE_KEY)), []);
  const changeViewMode = (next: ViewMode) => {
    setViewMode(next);
    storeViewMode(VIEW_STORAGE_KEY, next);
  };
  /** On phones the filters fold behind one button; from `sm` up they are always shown. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  // Only the first load replaces the list; later reloads keep the filters and rows on screen.
  const [loaded, setLoaded] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [statusFilter, setStatusFilter] = useState(() =>
    readUrlFilter('status', WORK_ORDER_STATUSES),
  );
  const [priorityFilter, setPriorityFilter] = useState(() =>
    readUrlFilter('priority', WORK_ORDER_PRIORITIES),
  );
  // Client ids are checked once the clients load (see below).
  const [clientFilter, setClientFilter] = useState(() => readUrlParam('client'));
  const [search, setSearch] = useState(() => readUrlParam('q'));
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sort, setSort] = useState<WorkOrderSort>(() =>
    readStoredTableSort(SORT_STORAGE_KEY, WORK_ORDER_SORT_KEYS, DEFAULT_WORK_ORDER_SORT),
  );

  const changeSort = (next: WorkOrderSort) => {
    setSort(next);
    storeTableSort(SORT_STORAGE_KEY, next);
  };
  const sortedWorkOrders = useMemo(
    () => sortWorkOrders(workOrders, sort).filter((wo) => matchesOrderSearch(wo, search)),
    [workOrders, sort, search],
  );

  // A client id from the URL that is not in the list (e.g. a deleted client) cannot be shown in
  // the dropdown, so it must not filter silently. Clients load after the list, so wait for them.
  useEffect(() => {
    if (clients.length > 0 && clientFilter && !clients.some((c) => c.id === clientFilter)) {
      setClientFilter('');
    }
  }, [clients, clientFilter]);

  useEffect(() => {
    writeUrlFilters({
      q: search.trim(),
      status: statusFilter,
      priority: priorityFilter,
      client: clientFilter,
    });
  }, [search, statusFilter, priorityFilter, clientFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      // The list is sorted in the browser, so it needs every page, not only the first.
      const items = await collectAllPages((cursor) =>
        listWorkOrders({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          clientId: clientFilter || undefined,
          cursor,
        }),
      );
      setWorkOrders(items);
    } catch {
      setErrorKey('workOrders.loadError');
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [statusFilter, priorityFilter, clientFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteWorkOrder(id);
      await load();
      setConfirmDelete(null);
    } catch (error) {
      setErrorKey(
        error instanceof ApiRequestError &&
          error.code === PAYMENT_ERROR_CODES.WORK_ORDER_HAS_PAYMENTS
          ? 'workOrders.deleteHasPayments'
          : 'workOrders.deleteError',
      );
    } finally {
      setDeleting(null);
    }
  };

  const filtered = Boolean(statusFilter || priorityFilter || clientFilter || search.trim());
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setClientFilter('');
  };
  const activeFilterCount = [statusFilter, priorityFilter, clientFilter].filter(Boolean).length;
  const todayKey = localDateKey(new Date());
  // Orders with payments (voided ones included) cannot be deleted; the API refuses them.
  const deleteLabel = (wo: WorkOrderClientSummary) =>
    t(wo.hasPayments ? 'workOrders.deleteBlockedNamed' : 'workOrders.deleteNamed', {
      name: wo.title,
    });

  return (
    <div className="space-y-5" data-testid="work-order-list">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Input
            id="workOrderSearch"
            type="search"
            aria-label={t('workOrders.search')}
            placeholder={t('workOrders.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl sm:w-64"
          />
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full gap-2 rounded-xl sm:hidden"
            aria-expanded={filtersOpen}
            aria-controls="workOrderFilters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            {activeFilterCount > 0
              ? t('workOrders.filtersActive', { count: activeFilterCount })
              : t('workOrders.filters')}
          </Button>
          <div
            id="workOrderFilters"
            className={`${filtersOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 sm:contents`}
          >
            <Select
              id="statusFilter"
              aria-label={t('workOrders.filterStatus')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl sm:w-40"
            >
              <option value="">{t('workOrders.allStatuses')}</option>
              {WORK_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s, language)}
                </option>
              ))}
            </Select>
            <Select
              id="priorityFilter"
              aria-label={t('workOrders.filterPriority')}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-xl sm:w-48"
            >
              <option value="">{t('workOrders.allPriorities')}</option>
              {WORK_ORDER_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p, language)}
                </option>
              ))}
            </Select>
            <Select
              id="clientFilter"
              aria-label={t('workOrders.filterClient')}
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full rounded-xl sm:w-40"
            >
              <option value="">{t('workOrders.allClients')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'cards' && (
            <SortSelect
              id="workOrderSort"
              label={t('workOrders.sortBy')}
              keys={WORK_ORDER_SORT_KEYS}
              keyLabel={(key) => t(SORT_LABEL_KEYS[key])}
              sort={sort}
              defaultSort={DEFAULT_WORK_ORDER_SORT}
              onChange={changeSort}
            />
          )}
          <ViewModeToggle
            value={viewMode}
            onChange={changeViewMode}
            ariaLabel={t('workOrders.view')}
          />
          <Button onClick={onCreate} className="min-h-11 rounded-xl px-6" variant="primary">
            {t('workOrders.new')}
          </Button>
        </div>
      </div>

      {errorKey && (
        <Alert
          type="error"
          icon={<TriangleAlert aria-hidden="true" className="h-4 w-4" />}
          onClose={() => setErrorKey(null)}
          action={
            errorKey === 'workOrders.loadError'
              ? { label: t('common.retry'), onClick: () => void load() }
              : undefined
          }
        >
          {t(errorKey)}
        </Alert>
      )}

      {loading && loaded && (
        <LoadingState
          role="status"
          aria-live="polite"
          size="sm"
          message={t('workOrders.updating')}
          className="flex-row justify-start py-1"
        />
      )}

      <div aria-busy={loading} data-testid="work-order-results">
        {!loaded ? (
          <Panel className="work-orders-state-panel" data-testid="work-orders-loading-state">
            <LoadingState message={t('workOrders.loading')} />
          </Panel>
        ) : sortedWorkOrders.length === 0 ? (
          <Panel className="work-orders-state-panel">
            {filtered ? (
              <EmptyState
                title={t('workOrders.noResultsTitle')}
                description={t('workOrders.noResultsDescription')}
                action={{ label: t('workOrders.clearFilters'), onClick: clearFilters }}
              />
            ) : (
              <EmptyState
                icon={<ClipboardList aria-hidden="true" className="h-10 w-10" />}
                title={t('workOrders.emptyTitle')}
                description={t('workOrders.emptyDescription')}
              />
            )}
          </Panel>
        ) : viewMode === 'table' ? (
          // The table can be wider than the screen, so its box must be focusable to scroll by keyboard.
          <div
            className="w-full max-w-full overflow-x-auto rounded-xl border border-border-subtle bg-bg-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            data-testid="work-order-table-container"
            role="region"
            aria-label={t('workOrders.listCaption')}
            tabIndex={0}
          >
            <table
              className="w-full min-w-[700px] text-left text-sm"
              data-testid="work-order-table"
            >
              <caption className="sr-only">{t('workOrders.listCaption')}</caption>
              <thead className="table-head border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <tr>
                  {COLUMN_SORT_KEYS.map((key) => (
                    <SortableHeader
                      key={key}
                      sortKey={key}
                      sort={sort}
                      onSort={(k) => changeSort(nextWorkOrderSort(sort, k))}
                    >
                      {t(SORT_LABEL_KEYS[key])}
                    </SortableHeader>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
                {sortedWorkOrders.map((wo) => (
                  <Fragment key={wo.id}>
                    <tr className={confirmDelete === wo.id ? 'bg-danger/5' : 'table-row'}>
                      <td className="px-4 py-3.5 font-medium">
                        <a
                          href={workOrderDetailsHref(wo.id)}
                          className="text-fg-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded"
                        >
                          {wo.title}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 text-fg-muted">{wo.clientName}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="tone" className={statusBadgeClass(wo.status)}>
                          {statusLabel(wo.status, language)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="tone" className={priorityBadgeClass(wo.priority)}>
                          {priorityLabel(wo.priority, language)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-fg-muted">
                        {wo.dueDate ? (
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <span
                              className={
                                isOverdue(wo, todayKey)
                                  ? 'font-medium text-destructive-text'
                                  : undefined
                              }
                            >
                              {formatDateOnly(wo.dueDate, language)}
                            </span>
                            {isOverdue(wo, todayKey) && (
                              <Badge variant="error" size="xs">
                                {t('workOrders.overdue')}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-fg-muted">
                        {wo.totalPriceMinor !== undefined && wo.currency
                          ? formatMoney(wo.totalPriceMinor, wo.currency)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div
                          className="row-actions inline-flex gap-2 justify-end"
                          data-testid="work-order-row-actions"
                        >
                          <RowActionButton
                            action="edit"
                            label={t('workOrders.editNamed', { name: wo.title })}
                            title={t('common.edit')}
                            onClick={() => onEdit?.(wo)}
                            disabled={confirmDelete !== null}
                          />
                          <RowActionButton
                            action="delete"
                            label={deleteLabel(wo)}
                            title={t('common.delete')}
                            onClick={() => setConfirmDelete(wo.id)}
                            disabled={confirmDelete !== null || deleting === wo.id}
                            disabledReason={
                              wo.hasPayments ? t('workOrders.deleteHasPayments') : undefined
                            }
                          />
                        </div>
                      </td>
                    </tr>
                    {confirmDelete === wo.id && (
                      <tr key={`${wo.id}-delete`}>
                        <td
                          colSpan={7}
                          className="bg-danger/10 px-4 py-3"
                          data-testid="delete-confirmation"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-fg-primary">
                              {t('workOrders.confirmDelete', { name: wo.title })}
                            </p>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => setConfirmDelete(null)}
                                disabled={deleting === wo.id}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                variant="delete"
                                size="sm"
                                className={rowActionButtonClass}
                                onClick={() => handleDelete(wo.id)}
                                isLoading={deleting === wo.id}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="work-order-cards">
            {sortedWorkOrders.map((wo) => (
              <div key={wo.id}>
                {confirmDelete === wo.id && (
                  <Panel
                    className="mb-3 border border-danger bg-danger/10"
                    data-testid="delete-confirmation"
                  >
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-fg-primary">
                        {t('workOrders.confirmDelete', { name: wo.title })}
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => setConfirmDelete(null)}
                          disabled={deleting === wo.id}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          variant="delete"
                          size="sm"
                          className={rowActionButtonClass}
                          onClick={() => handleDelete(wo.id)}
                          isLoading={deleting === wo.id}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </Panel>
                )}
                <Panel
                  className={
                    confirmDelete === wo.id
                      ? 'border border-border-subtle opacity-50'
                      : 'border border-border-subtle transition-colors hover:border-accent-brand/50'
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h2 className="font-medium text-fg-primary">
                        <a
                          href={workOrderDetailsHref(wo.id)}
                          className="text-fg-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded"
                        >
                          {wo.title}
                        </a>
                      </h2>
                      <p className="text-sm text-fg-muted">{wo.clientName}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant="tone" className={statusBadgeClass(wo.status)}>
                          {statusLabel(wo.status, language)}
                        </Badge>
                        <Badge variant="tone" className={priorityBadgeClass(wo.priority)}>
                          {priorityLabel(wo.priority, language)}
                        </Badge>
                        {wo.dueDate &&
                          (isOverdue(wo, todayKey) ? (
                            // One badge says it is overdue and when it was due.
                            <Badge variant="error">
                              {`${t('workOrders.overdue')} · ${formatDateOnly(wo.dueDate, language)}`}
                            </Badge>
                          ) : (
                            <Badge variant="neutral">{formatDateOnly(wo.dueDate, language)}</Badge>
                          ))}
                        {wo.totalPriceMinor !== undefined && wo.currency && (
                          <Badge variant="neutral">
                            {formatMoney(wo.totalPriceMinor, wo.currency)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="edit"
                        size="sm"
                        className={rowActionButtonClass}
                        onClick={() => onEdit?.(wo)}
                        disabled={confirmDelete !== null}
                        aria-label={t('workOrders.editNamed', { name: wo.title })}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="delete"
                        size="sm"
                        className={rowActionButtonClass}
                        onClick={wo.hasPayments ? undefined : () => setConfirmDelete(wo.id)}
                        disabled={confirmDelete !== null || deleting === wo.id}
                        // A blocked delete stays focusable, so its reason can be reached.
                        aria-disabled={wo.hasPayments ? true : undefined}
                        title={wo.hasPayments ? t('workOrders.deleteHasPayments') : undefined}
                        aria-label={deleteLabel(wo)}
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
