import { useState } from 'react';
import type { WorkOrder, Client, WorkOrderClientSummary } from '@ijac/shared';
import { createWorkOrder, updateWorkOrder } from '../../lib/resources';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from '@ijac/shared';

interface WorkOrderFormProps {
  clients: Client[];
  workOrder?: WorkOrderClientSummary;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormErrors {
  title?: string;
  clientId?: string;
  general?: string;
}

export function WorkOrderForm({ clients, workOrder, onSaved, onCancel }: WorkOrderFormProps) {
  const [form, setForm] = useState({
    title: workOrder?.title ?? '',
    description: '',
    status: workOrder?.status ?? 'open',
    priority: workOrder?.priority ?? 'normal',
    clientId: workOrder?.clientId ?? '',
    dueDate: workOrder?.dueDate ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.title.trim()) next.title = 'El título es obligatorio';
    if (!form.clientId) next.clientId = 'El cliente es obligatorio';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      if (workOrder) {
        await updateWorkOrder(workOrder.id, form);
      } else {
        await createWorkOrder(form as unknown as WorkOrder);
      }
      onSaved();
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="rounded-md bg-red-900/30 px-3 py-2 text-red-200">{errors.general}</div>
      )}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-300">
          Título
        </label>
        <input
          id="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-slate-300">
          Cliente
        </label>
        <select
          id="clientId"
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        >
          <option value="">Seleccionar cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.clientId && <p className="mt-1 text-xs text-red-300">{errors.clientId}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-300">
            Estado
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            {WORK_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-slate-300">
            Prioridad
          </label>
          <select
            id="priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          >
            {WORK_ORDER_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300">
          Fecha de vencimiento
        </label>
        <input
          id="dueDate"
          type="date"
          value={form.dueDate ? form.dueDate.slice(0, 10) : ''}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-300">
          Descripción
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : workOrder ? 'Guardar cambios' : 'Crear orden'}
        </button>
      </div>
    </form>
  );
}
