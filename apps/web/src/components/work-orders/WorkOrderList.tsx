import { useState, useEffect, useCallback } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { listWorkOrders, deleteWorkOrder } from '../../lib/resources';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '@ijac/shared';
import { Select, Button, Alert, EmptyState, LoadingState, Panel, Badge } from '../ui';

interface WorkOrderListProps {
  clients: Client[];
  onCreate?: () => void;
  onEdit?: (workOrder: WorkOrderClientSummary) => void;
}

export function WorkOrderList({ clients, onCreate, onEdit }: WorkOrderListProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrderClientSummary[]>([]);
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
    return <LoadingState>Cargando órdenes...</LoadingState>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
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
            className="w-40"
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
            className="w-40"
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={onCreate}>
          Nueva orden
        </Button>
      </div>

      {error && (
        <Alert type="error" icon="⚠️" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {workOrders.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No hay órdenes de trabajo"
          description="Crea tu primera orden para comenzar"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workOrders.map((wo) => (
            <div key={wo.id}>
              {confirmDelete === wo.id && (
                <Panel className="mb-3 border border-status-warning bg-status-warning/10">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-fg-primary">
                      ¿Eliminar orden "{wo.title}"?
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleting === wo.id}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
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
                className={confirmDelete === wo.id ? 'opacity-50' : ''}
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
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit?.(wo)}
                      disabled={confirmDelete !== null}
                      aria-label={`Editar ${wo.title}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
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
