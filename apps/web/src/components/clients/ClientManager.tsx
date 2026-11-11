import { useState } from 'react';
import type { Client } from '@ijac/shared';
import { ClientList } from './ClientList';
import { ClientForm } from './ClientForm';
import { useLanguage } from '../../hooks/useLanguage';
import { useRevealOnOpen } from '../../hooks/useRevealOnOpen';
import { SavedNotice } from '../ui';

export function ClientManager() {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  /** The client just saved, confirmed until dismissed or another form opens. */
  const [saved, setSaved] = useState<{ client: Client; created: boolean } | null>(null);

  const { panelRef, focusRef } = useRevealOnOpen<HTMLHeadingElement>(
    editing ? editing.id : creating ? 'new' : null,
  );

  const handleSaved = (client: Client) => {
    setSaved({ client, created: editing === null });
    setEditing(null);
    setCreating(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6" data-testid="clients-manager">
      {saved && (
        <SavedNotice data-testid="client-saved" onClose={() => setSaved(null)}>
          {t(saved.created ? 'clients.savedNew' : 'clients.savedEdit', {
            name: saved.client.name,
          })}
        </SavedNotice>
      )}

      {(creating || editing) && (
        <div
          ref={panelRef}
          className="scroll-mt-24 rounded-xl border border-border-subtle bg-bg-primary/70 p-4 sm:p-6"
          data-testid="client-form-panel"
        >
          <h3
            ref={focusRef}
            tabIndex={-1}
            className="mb-5 font-heading text-xl font-semibold text-fg-primary focus:outline-none"
          >
            {editing ? t('clients.edit') : t('clients.new')}
          </h3>
          {/* The form copies its client into state once, so each client gets its own instance. */}
          <ClientForm
            key={editing?.id ?? 'new'}
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
        onCreate={() => {
          setSaved(null);
          setCreating(true);
        }}
        onEdit={(client) => {
          setSaved(null);
          setEditing(client);
        }}
        onDeleted={(id) => setSaved((current) => (current?.client.id === id ? null : current))}
      />
    </div>
  );
}
