import { useState, useEffect } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { WorkOrderList } from './WorkOrderList';
import { WorkOrderForm } from './WorkOrderForm';
import { listClients } from '../../lib/resources';

export function WorkOrderManager() {
  const [editing, setEditing] = useState<WorkOrderClientSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    listClients({}).then((result) => setClients(Array.isArray(result?.items) ? result.items : []));
  }, [refreshKey]);

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Órdenes de trabajo</h2>
      </div>

      {(creating || editing) && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-4 text-lg font-medium text-slate-100">
            {editing ? 'Editar orden' : 'Nueva orden'}
          </h3>
          <WorkOrderForm
            clients={clients}
            workOrder={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}

      <WorkOrderList
        key={refreshKey}
        clients={clients}
        onCreate={() => setCreating(true)}
        onEdit={setEditing}
      />
    </div>
  );
}
