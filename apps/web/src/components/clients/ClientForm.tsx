import { useState } from 'react';
import type { Client } from '@ijac/shared';
import { createClient, updateClient } from '../../lib/resources';
import { Input, Textarea, Button, Alert } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';

interface ClientFormProps {
  client?: Client;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  general?: string;
}

export function ClientForm({ client, onSaved, onCancel }: ClientFormProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: client?.name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    organization: client?.organization ?? '',
    notes: client?.notes ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = t('clients.validation.name');
    if (!form.email.trim()) next.email = t('clients.validation.email');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = t('clients.validation.emailInvalid');
    if (!form.phone.trim()) next.phone = t('clients.validation.phone');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      if (client) {
        await updateClient(client.id, form);
      } else {
        await createClient(form);
      }
      onSaved();
    } catch {
      setErrors({ general: t('clients.saveError') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="client-form">
      {errors.general && (
        <Alert type="error" icon="⚠️" onClose={() => setErrors({ ...errors, general: undefined })}>
          {errors.general}
        </Alert>
      )}

      <Input
        id="name"
        label={t('clients.name')}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        error={errors.name}
        required
      />

      <Input
        id="email"
        type="email"
        label={t('clients.email')}
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
        required
      />

      <Input
        id="phone"
        label={t('clients.phone')}
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        error={errors.phone}
        required
      />

      <Input
        id="organization"
        label={t('clients.organization')}
        value={form.organization}
        onChange={(e) => setForm({ ...form, organization: e.target.value })}
      />

      <Textarea
        id="notes"
        label={t('clients.notes')}
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
        <Button
          type="submit"
          isLoading={submitting}
          variant="ghost"
          className="action-brand min-h-11 shrink-0 whitespace-nowrap rounded-xl border-2 px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0"
        >
          {submitting ? t('common.saving') : client ? t('common.saveChanges') : t('clients.create')}
        </Button>
      </div>
    </form>
  );
}
