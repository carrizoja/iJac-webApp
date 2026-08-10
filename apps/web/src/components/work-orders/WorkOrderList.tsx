import { useState, useEffect, useCallback, Fragment } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { listWorkOrders, deleteWorkOrder } from '../../lib/resources';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '@ijac/shared';
import { Select, Button, Alert, EmptyState, LoadingState, Panel, Badge, ViewModeToggle, type ViewMode } from '../ui';

interface WorkOrderListProps {
  clients: Client[];
  onCreate?: () => void;
  onEdit?: (workOrder: WorkOrderClientSummary) => void;
}

export function WorkOrderList({ clients, onCreate, onEdit }: WorkOrderListProps) {
  const neonActionButtonBaseClass =
    'rounded-lg border-2 bg-[#080808] px-4 text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white active:translate-y-0';
  const editActionButtonClass =
    `${neonActionButtonBaseClass} border-[#22d3ee] hover:border-[#06b6d4] hover:bg-[#06b6d4] hover:shadow-[0_0_0_1px_#06b6d4,0_10px_28px_rgba(6,182,212,0.42)] active:shadow-[0_0_0_1px_#06b6d4,0_6px_16px_rgba(6,182,212,0.35)]`;
  const deleteActionButtonClass =
    `${neonActionButtonBaseClass} border-[#f87171] hover:border-[#ef4444] hover:bg-[#ef4444] hover:shadow-[0_0_0_1px_#ef4444,0_10px_28px_rgba(239,68,68,0.42)] active:shadow-[0_0_0_1px_#ef4444,0_6px_16px_rgba(239,68,68,0.35)]`;
  const [workOrders, setWorkOrders] = useState<WorkOrderClientSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listWorkOrders({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        clientId: clientFilter || undefined,
      });
      setWorkOrders(Array.isArray(result?.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high' || priority === 'urgente') return 'bg-priority-high';
    if (priority === 'normal' || priority === 'media') return 'bg-priority-normal';
    return 'bg-priority-low';
  };

  if (loading) {
    return (
      <Panel className="work-orders-state-panel" data-testid="work-orders-loading-state">
        <LoadingState message="Cargando órdenes..." />
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
            <option value="">Todos los estados</option>
            {WORK_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            id="priorityFilter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full rounded-xl sm:w-48"
          >
            <option value="">Todas las prioridades</option>
            {WORK_ORDER_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select
            id="clientFilter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full rounded-xl sm:w-40"
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ViewModeToggle value={viewMode} onChange={setViewMode} ariaLabel="Vista de órdenes" />
          <Button
            onClick={onCreate}
            className="min-h-11 rounded-xl border-2 border-[#00d084] bg-[#080808] px-6 text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#00c978] hover:bg-[#00c978] hover:text-white hover:shadow-[0_0_0_1px_#00c978,0_10px_28px_rgba(0,201,120,0.45)] active:translate-y-0 active:shadow-[0_0_0_1px_#00c978,0_6px_16px_rgba(0,201,120,0.35)]"
            variant="ghost"
          >
            Nueva orden
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" icon="⚠️" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {workOrders.length === 0 ? (
        <Panel className="work-orders-state-panel">
          <EmptyState
            icon="📋"
            title="No hay órdenes de trabajo"
            description="Crea tu primera orden para comenzar"
          />
        </Panel>
      ) : viewMode === 'table' ? (
        <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border-subtle bg-bg-primary/60" data-testid="work-order-table-container">
          <table className="w-full min-w-[700px] text-left text-sm" data-testid="work-order-table">
            <caption className="sr-only">Lista de órdenes de trabajo</caption>
            <thead className="border-b border-border-subtle bg-[#080808]/80 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Título</th>
                <th scope="col" className="px-4 py-3">Cliente</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Prioridad</th>
                <th scope="col" className="px-4 py-3">Fecha límite</th>
                <th scope="col" className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
              {workOrders.map((wo) => (
                <Fragment key={wo.id}>
                  <tr className={confirmDelete === wo.id ? 'bg-priority-high/5' : 'hover:bg-[#080808]/40'}>
                    <td className="px-4 py-3.5 font-medium">{wo.title}</td>
                    <td className="px-4 py-3.5 text-fg-muted">{wo.clientName}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="neutral">{wo.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="neutral" className={getPriorityColor(wo.priority)}>
                        {wo.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-fg-muted">
                      {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={editActionButtonClass}
                          onClick={() => onEdit?.(wo)}
                          disabled={confirmDelete !== null}
                          aria-label={`Editar ${wo.title}`}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={deleteActionButtonClass}
                          onClick={() => setConfirmDelete(wo.id)}
                          disabled={confirmDelete !== null || deleting === wo.id}
                          aria-label={`Eliminar ${wo.title}`}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {confirmDelete === wo.id && (
                    <tr key={`${wo.id}-delete`}>
                      <td colSpan={6} className="bg-priority-high/10 px-4 py-3" data-testid="delete-confirmation">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-fg-primary">
                            ¿Eliminar orden "{wo.title}"?
                          </p>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg border border-[#2f2f2f] bg-[#080808] text-white transition-colors duration-200 hover:border-[#3a3a3a] hover:bg-[#0f0f0f]"
                              onClick={() => setConfirmDelete(null)}
                              disabled={deleting === wo.id}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={deleteActionButtonClass}
                              onClick={() => handleDelete(wo.id)}
                              isLoading={deleting === wo.id}
                            >
                              Eliminar
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
                <Panel className="mb-3 border border-priority-high bg-priority-high/10" data-testid="delete-confirmation">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-fg-primary">
                      ¿Eliminar orden "{wo.title}"?
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg border border-[#2f2f2f] bg-[#080808] text-white transition-colors duration-200 hover:border-[#3a3a3a] hover:bg-[#0f0f0f]"
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleting === wo.id}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={deleteActionButtonClass}
                        onClick={() => handleDelete(wo.id)}
                        isLoading={deleting === wo.id}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Panel>
              )}
              <Panel
                className={confirmDelete === wo.id ? 'border border-border-subtle opacity-50' : 'border border-border-subtle transition-colors hover:border-accent-brand/50'}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-fg-primary">{wo.title}</h3>
                    <p className="text-sm text-fg-muted">{wo.clientName}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="neutral">
                        {wo.status}
                      </Badge>
                      <Badge variant="neutral" className={getPriorityColor(wo.priority)}>
                        {wo.priority}
                      </Badge>
                      {wo.dueDate && (
                        <Badge variant="neutral">
                          {new Date(wo.dueDate).toLocaleDateString()}
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
                      aria-label={`Editar ${wo.title}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={deleteActionButtonClass}
                      onClick={() => setConfirmDelete(wo.id)}
                      disabled={confirmDelete !== null || deleting === wo.id}
                      aria-label={`Eliminar ${wo.title}`}
                    >
                      Eliminar
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
