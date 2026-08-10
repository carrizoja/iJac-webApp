import { useRef, useState } from 'react';
import type { Client, WorkOrderClientSummary } from '@ijac/shared';
import { WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES, WorkOrderStatus, WorkOrderPriority } from '@ijac/shared';
import { createWorkOrder, updateWorkOrder } from '../../lib/resources';
import { Input, Textarea, Select, Button, Alert } from '../ui';

interface WorkOrderFormProps {
  clients: Client[];
  workOrder?: WorkOrderClientSummary;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormErrors {
  title?: string;
  clientId?: string;
  status?: string;
  priority?: string;
  general?: string;
}

export function WorkOrderForm({ clients, workOrder, onSaved, onCancel }: WorkOrderFormProps) {
  const [form, setForm] = useState({
    title: workOrder?.title ?? '',
    description: '',
    status: workOrder?.status ?? '',
    priority: workOrder?.priority ?? '',
    clientId: workOrder?.clientId ?? '',
    dueDate: workOrder?.dueDate ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.title.trim()) next.title = 'El título es obligatorio';
    if (!form.clientId) next.clientId = 'El cliente es obligatorio';
    if (!form.status) next.status = 'El estado es obligatorio';
    if (!form.priority) next.priority = 'La prioridad es obligatoria';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status as WorkOrderStatus,
        priority: form.priority as WorkOrderPriority,
        clientId: form.clientId,
      };
      if (workOrder) {
        await updateWorkOrder(workOrder.id, {
          ...payload,
          dueDate: form.dueDate || null,
        });
      } else {
        await createWorkOrder({
          ...payload,
          ...(form.dueDate ? { dueDate: form.dueDate } : {}),
        });
      }
      onSaved();
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {errors.general && (
        <Alert type="error" icon="⚠️" onClose={() => setErrors({ ...errors, general: undefined })}>
          {errors.general}
        </Alert>
      )}

      <Input
        id="title"
        label="Título"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        error={errors.title}
        required
      />

      <Select
        id="clientId"
        label="Cliente"
        value={form.clientId}
        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        error={errors.clientId}
        required
      >
        <option value="">Seleccionar cliente</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="status"
          label="Estado"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          error={errors.status}
          required
        >
          <option value="" disabled>
            Seleccionar estado
          </option>
          {WORK_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          id="priority"
          label="Prioridad"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          error={errors.priority}
          required
        >
          <option value="" disabled>
            Seleccionar prioridad
          </option>
          {WORK_ORDER_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          ref={dueDateRef}
          id="dueDate"
          type="date"
          label="Fecha de vencimiento"
          wrapperClassName="flex-1"
          value={form.dueDate ? form.dueDate.slice(0, 10) : ''}
          onChange={(e) =>
            setForm({
              ...form,
              dueDate: e.target.value
                ? new Date(e.target.value).toISOString()
                : '',
            })
          }
        />
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border-default bg-bg-primary px-4 text-sm font-medium text-fg-primary transition-fast hover:border-border-active hover:bg-panel-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          onClick={() => {
            dueDateRef.current?.focus();
            dueDateRef.current?.showPicker?.();
          }}
          aria-label="Abrir calendario de fecha de vencimiento"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M7 2v3M17 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          </svg>
          Abrir calendario
        </button>
      </div>

      <Textarea
        id="description"
        label="Descripción"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={3}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 rounded-xl border border-[#2f2f2f] bg-[#080808] px-5 text-white transition-colors duration-200 hover:border-[#3a3a3a] hover:bg-[#0f0f0f]"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={submitting}
          className="min-h-11 rounded-xl px-5"
        >
          {submitting ? 'Guardando...' : workOrder ? 'Guardar cambios' : 'Crear orden'}
        </Button>
      </div>
    </form>
  );
}
