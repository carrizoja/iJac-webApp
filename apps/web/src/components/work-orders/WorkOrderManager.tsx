import { useState, useEffect, useRef } from 'react';
import type { WorkOrder, WorkOrderClientSummary, Client } from '@ijac/shared';
import { WorkOrderList } from './WorkOrderList';
import { WorkOrderForm } from './WorkOrderForm';
import { getWorkOrder, listClients } from '../../lib/resources';
import { collectAllPages } from '../../lib/collectAllPages';
import { useLanguage } from '../../hooks/useLanguage';
import { useRevealOnOpen } from '../../hooks/useRevealOnOpen';
import { Alert } from '../ui';

export function WorkOrderManager() {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [editLoadError, setEditLoadError] = useState(false);
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

  // The list only has summaries; the form needs the full order so it can keep the description.
  // Only the latest Edit click counts, so a slower response for an earlier row is ignored.
  const latestEdit = useRef(0);
  const startEditing = async (summary: WorkOrderClientSummary) => {
    const request = ++latestEdit.current;
    setEditLoadError(false);
    try {
      const order = await getWorkOrder(summary.id);
      if (request !== latestEdit.current) return;
      setEditing(order);
      setCreating(false);
    } catch {
      if (request === latestEdit.current) setEditLoadError(true);
    }
  };

  const closeForm = () => {
    latestEdit.current += 1;
    setEditing(null);
    setCreating(false);
  };

  const handleSaved = () => {
    closeForm();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {clientsError ? (
        <Alert type="error" onClose={() => setClientsError(false)}>
          {t('clients.loadError')}
        </Alert>
      ) : null}

      {editLoadError ? (
        <Alert type="error" onClose={() => setEditLoadError(false)}>
          {t('workOrders.editLoadError')}
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
          {/* The form copies its order into state once, so each order gets its own instance. */}
          <WorkOrderForm
            key={editing?.id ?? 'new'}
            clients={clients}
            workOrder={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        </div>
      )}

      <WorkOrderList
        key={refreshKey}
        clients={clients}
        onCreate={() => {
          closeForm();
          setCreating(true);
        }}
        onEdit={(summary) => void startEditing(summary)}
      />
    </div>
  );
}
