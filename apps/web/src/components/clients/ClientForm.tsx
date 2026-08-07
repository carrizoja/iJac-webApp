import { useState } from 'react';
import type { Client } from '@ijac/shared';
import { createClient, updateClient } from '../../lib/resources';
import { Input, Textarea, Button, Alert } from '../ui';

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
    if (!form.name.trim()) next.name = 'El nombre es obligatorio';
    if (!form.email.trim()) next.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email inválido';
    if (!form.phone.trim()) next.phone = 'El teléfono es obligatorio';
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
        id="name"
        label="Nombre"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        error={errors.name}
        required
      />

      <Input
        id="email"
        type="email"
        label="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
        required
      />

      <Input
        id="phone"
        label="Teléfono"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        error={errors.phone}
        required
      />

      <Input
        id="organization"
        label="Organización"
        value={form.organization}
        onChange={(e) => setForm({ ...form, organization: e.target.value })}
      />

      <Textarea
        id="notes"
        label="Notas"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          {submitting ? 'Guardando...' : client ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  );
}
