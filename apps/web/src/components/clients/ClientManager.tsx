import { useState } from 'react';
import type { Client } from '@ijac/shared';
import { ClientList } from './ClientList';
import { ClientForm } from './ClientForm';

export function ClientManager() {
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Clientes</h2>
      </div>

      {(creating || editing) && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-4 text-lg font-medium text-slate-100">
            {editing ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
          <ClientForm
            client={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}

      <ClientList
        key={refreshKey}
        onCreate={() => setCreating(true)}
        onEdit={setEditing}
      />
    </div>
  );
}
