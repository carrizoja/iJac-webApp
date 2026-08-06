import { useState } from 'react';
import type { Client } from '@ijac/shared';
import { createClient, updateClient } from '../../lib/resources';

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
        <div className="rounded-md bg-red-900/30 px-3 py-2 text-red-200">{errors.general}</div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300">
          Nombre
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
          Teléfono
        </label>
        <input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="organization" className="block text-sm font-medium text-slate-300">
          Organización
        </label>
        <input
          id="organization"
          value={form.organization}
          onChange={(e) => setForm({ ...form, organization: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-300">
          Notas
        </label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          {submitting ? 'Guardando...' : client ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
