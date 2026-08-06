import { useState, useEffect } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { listWorkOrders, deleteWorkOrder } from '../../lib/resources';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '@ijac/shared';

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

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [statusFilter, priorityFilter, clientFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta orden de trabajo?')) return;
    setDeleting(id);
    try {
      await deleteWorkOrder(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando órdenes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Todos los estados</option>
            {WORK_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Todas las prioridades</option>
            {WORK_ORDER_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light"
        >
          Nueva orden
        </button>
      </div>

      {error && <div className="rounded-md bg-red-900/30 px-3 py-2 text-red-200">{error}</div>}

      {workOrders.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          No hay órdenes para mostrar.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-slate-100">{wo.title}</h3>
                  <p className="text-sm text-slate-400">{wo.clientName}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{wo.status}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">{wo.priority}</span>
                    {wo.dueDate && (
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-300">
                        {new Date(wo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit?.(wo)}
                    className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    aria-label={`Editar ${wo.title}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(wo.id)}
                    disabled={deleting === wo.id}
                    className="rounded-md px-2 py-1 text-xs text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                    aria-label={`Eliminar ${wo.title}`}
                  >
                    {deleting === wo.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
