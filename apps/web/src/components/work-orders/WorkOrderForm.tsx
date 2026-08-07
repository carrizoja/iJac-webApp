import { useState } from 'react';
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
      const payload = {
        ...form,
        status: form.status as WorkOrderStatus,
        priority: form.priority as WorkOrderPriority,
      };
      if (workOrder) {
        await updateWorkOrder(workOrder.id, payload);
      } else {
        await createWorkOrder(payload);
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
        >
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
        >
          {WORK_ORDER_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <Input
        id="dueDate"
        type="date"
        label="Fecha de vencimiento"
        value={form.dueDate ? form.dueDate.slice(0, 10) : ''}
        onChange={(e) =>
          setForm({ ...form, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })
        }
      />

      <Textarea
        id="description"
        label="Descripción"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={submitting}
        >
          {submitting ? 'Guardando...' : workOrder ? 'Guardar cambios' : 'Crear orden'}
        </Button>
      </div>
    </form>
  );
}
