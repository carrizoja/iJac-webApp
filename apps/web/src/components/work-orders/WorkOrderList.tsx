import { useState, useEffect, useCallback, Fragment } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { listWorkOrders, deleteWorkOrder } from '../../lib/resources';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '@ijac/shared';
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

interface WorkOrderListProps {
  clients: Client[];
  onCreate?: () => void;
  onEdit?: (workOrder: WorkOrderClientSummary) => void;
}

export function WorkOrderList({ clients, onCreate, onEdit }: WorkOrderListProps) {
  const { language, t } = useLanguage();
  const neonActionButtonBaseClass =
    'rounded-lg border-2 px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0';
  const editActionButtonClass = `${neonActionButtonBaseClass} action-edit`;
  const deleteActionButtonClass = `${neonActionButtonBaseClass} action-delete`;
  const [workOrders, setWorkOrders] = useState<WorkOrderClientSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const result = await listWorkOrders({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        clientId: clientFilter || undefined,
      });
      setWorkOrders(Array.isArray(result?.items) ? result.items : []);
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
    } catch {
      setErrorKey('workOrders.deleteError');
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
                <th scope="col" className="px-4 py-3">
                  {t('workOrders.title')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('workOrders.client')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('workOrders.status')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('workOrders.priority')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('workOrders.deadline')}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
              {workOrders.map((wo) => (
                <Fragment key={wo.id}>
                  <tr className={confirmDelete === wo.id ? 'bg-priority-high/5' : 'table-row'}>
                    <td className="px-4 py-3.5 font-medium">{wo.title}</td>
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
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-2 justify-end">
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
                    </td>
                  </tr>
                  {confirmDelete === wo.id && (
                    <tr key={`${wo.id}-delete`}>
                      <td
                        colSpan={6}
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
          {workOrders.map((wo) => (
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
                    <h3 className="font-medium text-fg-primary">{wo.title}</h3>
                    <p className="text-sm text-fg-muted">{wo.clientName}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="neutral">{statusLabel(wo.status, language)}</Badge>
                      <Badge variant="neutral" className={getPriorityColor(wo.priority)}>
                        {priorityLabel(wo.priority, language)}
                      </Badge>
                      {wo.dueDate && (
                        <Badge variant="neutral">{formatDateOnly(wo.dueDate, language)}</Badge>
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
