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
    <div className="space-y-6" data-testid="clients-manager">

      {(creating || editing) && (
        <div className="rounded-xl border border-border-subtle bg-bg-primary/70 p-4 sm:p-6" data-testid="client-form-panel">
          <h3 className="mb-5 font-heading text-xl font-semibold text-fg-primary">
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
