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
  Select,
  Button,
  Alert,
  EmptyState,
  LoadingState,
  Panel,
  Badge,
  ViewModeToggle,
  type ViewMode,
} from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, priorityLabel, statusLabel } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/translations';
import {
  DEFAULT_WORK_ORDER_SORT,
  WORK_ORDER_SORT_KEYS,
  nextWorkOrderSort,
  parseWorkOrderSort,
  sortWorkOrders,
  toWorkOrderSort,
  type WorkOrderSort,
  type WorkOrderSortKey,
} from './workOrderSort';

const SORT_STORAGE_KEY = 'ijac.workOrders.sort';
/** Stops paging if the API ever keeps returning a cursor. */
const MAX_PAGES = 50;

const SORT_LABEL_KEYS: Record<WorkOrderSortKey, TranslationKey> = {
  createdAt: 'workOrders.createdAt',
  title: 'workOrders.title',
  client: 'workOrders.client',
  status: 'workOrders.status',
  priority: 'workOrders.priority',
  dueDate: 'workOrders.deadline',
  totalPrice: 'workOrders.totalPrice',
};

function readStoredSort(): WorkOrderSort {
  try {
    return parseWorkOrderSort(window.localStorage.getItem(SORT_STORAGE_KEY));
  } catch {
    return DEFAULT_WORK_ORDER_SORT;
  }
}

function storeSort(sort: WorkOrderSort): void {
  try {
    window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // Storage can be unavailable (private mode); the sort still works for this visit.
  }
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

interface SortableHeaderProps {
  sortKey: WorkOrderSortKey;
  sort: WorkOrderSort;
  onSort: (key: WorkOrderSortKey) => void;
  children: string;
}

/** Column header that sorts the list; `aria-sort` tells screen readers the current order. */
function SortableHeader({ sortKey, sort, onSort, children }: SortableHeaderProps) {
  const active = sort.key === sortKey;
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" className="px-4 py-3" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 rounded uppercase tracking-wider hover:text-fg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {children}
        <span aria-hidden="true" className={active ? 'text-fg-primary' : 'opacity-30'}>
          {active && sort.direction === 'desc' ? '↓' : '↑'}
        </span>
      </button>
    </th>
  );
}

interface WorkOrderListProps {
  clients: Client[];
  onCreate?: () => void;
  onEdit?: (workOrder: WorkOrderClientSummary) => void;
}

function workOrderDetailsHref(id: string): string {
  return `/work-orders/details?id=${encodeURIComponent(id)}`;
}

export function WorkOrderList({ clients, onCreate, onEdit }: WorkOrderListProps) {
  const { language, t } = useLanguage();
  const neonActionButtonBaseClass =
    'rounded-lg border-2 px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0';
  const editActionButtonClass = `${neonActionButtonBaseClass} action-edit`;
  const deleteActionButtonClass = `${neonActionButtonBaseClass} action-delete`;
  const iconButtonBaseClass =
    'h-9 w-9 rounded-lg border-2 px-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0';
  const editIconButtonClass = `${iconButtonBaseClass} action-edit`;
  const deleteIconButtonClass = `${iconButtonBaseClass} action-delete`;
  const [workOrders, setWorkOrders] = useState<WorkOrderClientSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sort, setSort] = useState<WorkOrderSort>(readStoredSort);

  const changeSort = (next: WorkOrderSort) => {
    setSort(next);
    storeSort(next);
  };
  const sortedWorkOrders = useMemo(() => sortWorkOrders(workOrders, sort), [workOrders, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      // The list is sorted in the browser, so it needs every page, not only the first.
      const items: WorkOrderClientSummary[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await listWorkOrders({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          clientId: clientFilter || undefined,
          cursor,
        });
        if (Array.isArray(result?.items)) items.push(...result.items);
        cursor = result?.nextCursor;
        if (!cursor) break;
      }
      setWorkOrders(items);
    } catch {
      setErrorKey('workOrders.loadError');
    } finally {
      setLoading(false);
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

  const getPriorityColor = (priority: string) => {
    if (priority === 'high' || priority === 'urgent') return 'priority-high-badge';
    if (priority === 'normal') return 'priority-normal-badge';
    return 'priority-low-badge';
  };

  if (loading) {
    return (
      <Panel className="work-orders-state-panel" data-testid="work-orders-loading-state">
        <LoadingState message={t('workOrders.loading')} />
      </Panel>
    );
  }

  return (
    <div className="space-y-5" data-testid="work-order-list">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select
            id="statusFilter"
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
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'cards' && (
            <>
              <label htmlFor="workOrderSort" className="sr-only">
                {t('workOrders.sortBy')}
              </label>
              <Select
                id="workOrderSort"
                value={`${sort.key}:${sort.direction}`}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split(':');
                  changeSort(toWorkOrderSort({ key, direction }));
                }}
                className="w-full rounded-xl sm:w-60"
              >
                {WORK_ORDER_SORT_KEYS.flatMap((key) =>
                  (['asc', 'desc'] as const).map((direction) => (
                    <option key={`${key}:${direction}`} value={`${key}:${direction}`}>
                      {`${t(SORT_LABEL_KEYS[key])} ${direction === 'asc' ? '↑' : '↓'}`}
                    </option>
                  )),
                )}
              </Select>
            </>
          )}
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            ariaLabel={t('workOrders.view')}
          />
          <Button
            onClick={onCreate}
            className="action-brand min-h-11 rounded-xl border-2 px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0"
            variant="ghost"
          >
            {t('workOrders.new')}
          </Button>
        </div>
      </div>

      {errorKey && (
        <Alert type="error" icon="⚠️" onClose={() => setErrorKey(null)}>
          {t(errorKey)}
        </Alert>
      )}

      {workOrders.length === 0 ? (
        <Panel className="work-orders-state-panel">
          <EmptyState
            icon="📋"
            title={t('workOrders.emptyTitle')}
            description={t('workOrders.emptyDescription')}
          />
        </Panel>
      ) : viewMode === 'table' ? (
        <div
          className="w-full max-w-full overflow-x-auto rounded-xl border border-border-subtle bg-bg-primary/60"
          data-testid="work-order-table-container"
        >
          <table className="w-full min-w-[700px] text-left text-sm" data-testid="work-order-table">
            <caption className="sr-only">{t('workOrders.listCaption')}</caption>
            <thead className="table-head border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <tr>
                {(['title', 'client', 'status', 'priority', 'dueDate', 'totalPrice'] as const).map(
                  (key) => (
                    <SortableHeader
                      key={key}
                      sortKey={key}
                      sort={sort}
                      onSort={(k) => changeSort(nextWorkOrderSort(sort, k))}
                    >
                      {t(SORT_LABEL_KEYS[key])}
                    </SortableHeader>
                  ),
                )}
                <th scope="col" className="px-4 py-3 text-right">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
              {sortedWorkOrders.map((wo) => (
                <Fragment key={wo.id}>
                  <tr className={confirmDelete === wo.id ? 'bg-priority-high/5' : 'table-row'}>
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
                      <Badge variant="neutral">{statusLabel(wo.status, language)}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="neutral" className={getPriorityColor(wo.priority)}>
                        {priorityLabel(wo.priority, language)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-fg-muted">
                      {wo.dueDate ? formatDateOnly(wo.dueDate, language) : '—'}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className={editIconButtonClass}
                          onClick={() => onEdit?.(wo)}
                          disabled={confirmDelete !== null}
                          aria-label={t('workOrders.editNamed', { name: wo.title })}
                          title={t('common.edit')}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={deleteIconButtonClass}
                          onClick={() => setConfirmDelete(wo.id)}
                          disabled={confirmDelete !== null || deleting === wo.id}
                          aria-label={t('workOrders.deleteNamed', { name: wo.title })}
                          title={t('common.delete')}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {confirmDelete === wo.id && (
                    <tr key={`${wo.id}-delete`}>
                      <td
                        colSpan={7}
                        className="bg-priority-high/10 px-4 py-3"
                        data-testid="delete-confirmation"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-fg-primary">
                            {t('workOrders.confirmDelete', { name: wo.title })}
                          </p>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="action-surface rounded-lg border transition-colors duration-200"
                              onClick={() => setConfirmDelete(null)}
                              disabled={deleting === wo.id}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={deleteActionButtonClass}
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
                  className="mb-3 border border-priority-high bg-priority-high/10"
                  data-testid="delete-confirmation"
                >
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-fg-primary">
                      {t('workOrders.confirmDelete', { name: wo.title })}
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="action-surface rounded-lg border transition-colors duration-200"
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleting === wo.id}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={deleteActionButtonClass}
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
                    <h3 className="font-medium text-fg-primary">
                      <a
                        href={workOrderDetailsHref(wo.id)}
                        className="text-fg-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded"
                      >
                        {wo.title}
                      </a>
                    </h3>
                    <p className="text-sm text-fg-muted">{wo.clientName}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="neutral">{statusLabel(wo.status, language)}</Badge>
                      <Badge variant="neutral" className={getPriorityColor(wo.priority)}>
                        {priorityLabel(wo.priority, language)}
                      </Badge>
                      {wo.dueDate && (
                        <Badge variant="neutral">{formatDateOnly(wo.dueDate, language)}</Badge>
                      )}
                      {wo.totalPriceMinor !== undefined && wo.currency && (
                        <Badge variant="neutral">
                          {formatMoney(wo.totalPriceMinor, wo.currency)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={editActionButtonClass}
                      onClick={() => onEdit?.(wo)}
                      disabled={confirmDelete !== null}
                      aria-label={t('workOrders.editNamed', { name: wo.title })}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={deleteActionButtonClass}
                      onClick={() => setConfirmDelete(wo.id)}
                      disabled={confirmDelete !== null || deleting === wo.id}
                      aria-label={t('workOrders.deleteNamed', { name: wo.title })}
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
  );
}
