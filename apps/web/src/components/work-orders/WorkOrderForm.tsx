import { useRef, useState } from 'react';
import type { Client, WorkOrderClientSummary } from '@ijac/shared';
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_PRIORITIES,
  WorkOrderStatus,
  WorkOrderPriority,
} from '@ijac/shared';
import { createWorkOrder, updateWorkOrder } from '../../lib/resources';
import { Input, Textarea, Select, Button, Alert } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { priorityLabel, statusLabel } from '../../i18n/format';

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
  const { language, t } = useLanguage();
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
    if (!form.title.trim()) next.title = t('workOrders.validation.title');
    if (!form.clientId) next.clientId = t('workOrders.validation.client');
    if (!form.status) next.status = t('workOrders.validation.status');
    if (!form.priority) next.priority = t('workOrders.validation.priority');
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
    } catch {
      setErrors({ general: t('workOrders.saveError') });
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
        label={t('workOrders.title')}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        error={errors.title}
        required
      />

      <Select
        id="clientId"
        label={t('workOrders.client')}
        value={form.clientId}
        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
        error={errors.clientId}
        required
      >
        <option value="">{t('workOrders.selectClient')}</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="status"
          label={t('workOrders.status')}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          error={errors.status}
          required
        >
          <option value="" disabled>
            {t('workOrders.selectStatus')}
          </option>
          {WORK_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, language)}
            </option>
          ))}
        </Select>

        <Select
          id="priority"
          label={t('workOrders.priority')}
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          error={errors.priority}
          required
        >
          <option value="" disabled>
            {t('workOrders.selectPriority')}
          </option>
          {WORK_ORDER_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {priorityLabel(p, language)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          ref={dueDateRef}
          id="dueDate"
          type="date"
          label={t('workOrders.dueDate')}
          wrapperClassName="flex-1"
          value={form.dueDate ? form.dueDate.slice(0, 10) : ''}
          onChange={(e) =>
            setForm({
              ...form,
              dueDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : '',
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
          aria-label={t('workOrders.openDueDate')}
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
          {t('workOrders.openCalendar')}
        </button>
      </div>

      <Textarea
        id="description"
        label={t('workOrders.description')}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        rows={3}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="action-surface min-h-11 rounded-xl border px-5 transition-colors duration-200"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={submitting} className="min-h-11 rounded-xl px-5">
          {submitting
            ? t('common.saving')
            : workOrder
              ? t('common.saveChanges')
              : t('workOrders.create')}
        </Button>
      </div>
    </form>
  );
}
