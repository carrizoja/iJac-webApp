import { useState, useEffect } from 'react';
import type { WorkOrderClientSummary, Client } from '@ijac/shared';
import { WorkOrderList } from './WorkOrderList';
import { WorkOrderForm } from './WorkOrderForm';
import { listClients } from '../../lib/resources';
import { collectAllPages } from '../../lib/collectAllPages';
import { useLanguage } from '../../hooks/useLanguage';
import { useRevealOnOpen } from '../../hooks/useRevealOnOpen';
import { Alert } from '../ui';

export function WorkOrderManager() {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<WorkOrderClientSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clientsError, setClientsError] = useState(false);

  useEffect(() => {
    setClientsError(false);
    // Every client, not only the first page, so the filter and form can offer all of them.
    collectAllPages((cursor) => listClients({ cursor }))
      .then(setClients)
      .catch(() => setClientsError(true));
  }, [refreshKey]);

  const { panelRef, focusRef } = useRevealOnOpen<HTMLHeadingElement>(
    editing ? editing.id : creating ? 'new' : null,
  );

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fg-primary">{t('workOrders.pageHeading')}</h2>
      </div>

      {clientsError ? (
        <Alert type="error" onClose={() => setClientsError(false)}>
          {t('clients.loadError')}
        </Alert>
      ) : null}

      {(creating || editing) && (
        <div
          ref={panelRef}
          className="scroll-mt-24 rounded-xl border border-border-subtle bg-bg-primary/70 p-4 sm:p-6"
          data-testid="work-order-form-panel"
        >
          <h3
            ref={focusRef}
            tabIndex={-1}
            className="mb-5 font-heading text-xl font-semibold text-fg-primary focus:outline-none"
          >
            {editing ? t('workOrders.edit') : t('workOrders.new')}
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
