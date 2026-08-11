import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import type { Client } from '@ijac/shared';
import { listClients, deleteClient } from '../../lib/resources';
import {
  Input,
  Button,
  Alert,
  EmptyState,
  LoadingState,
  Panel,
  ViewModeToggle,
  type ViewMode,
} from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../i18n/translations';

interface ClientListProps {
  onCreate?: () => void;
  onEdit?: (client: Client) => void;
}

export function ClientList({ onCreate, onEdit }: ClientListProps) {
  const { t } = useLanguage();
  const neonActionButtonBaseClass =
    'rounded-lg border-2 px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0';
  const editActionButtonClass = `${neonActionButtonBaseClass} action-edit`;
  const deleteActionButtonClass = `${neonActionButtonBaseClass} action-delete`;
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const latestRequestId = useRef(0);
  const hasRequested = useRef(false);

  const load = useCallback(async (searchTerm: string, background = false) => {
    const requestId = ++latestRequestId.current;
    if (background) setSearching(true);
    setErrorKey(null);
    try {
      const result = await listClients({ search: searchTerm });
      if (requestId !== latestRequestId.current) return;
      setClients(Array.isArray(result?.items) ? result.items : []);
    } catch {
      if (requestId !== latestRequestId.current) return;
      setErrorKey('clients.loadError');
    } finally {
      if (requestId === latestRequestId.current) {
        setInitialLoading(false);
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const background = hasRequested.current;
    hasRequested.current = true;
    void load(debouncedSearch, background);
  }, [debouncedSearch, load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteClient(id);
      await load(debouncedSearch, true);
      setConfirmDelete(null);
    } catch {
      setErrorKey('clients.deleteError');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5" data-testid="client-list">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="search"
          type="search"
          value={search}
          onChange={(e) => {
            latestRequestId.current += 1;
            setSearching(false);
            setSearch(e.target.value);
          }}
          placeholder={t('clients.search')}
          className="w-full rounded-xl sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <ViewModeToggle value={viewMode} onChange={setViewMode} ariaLabel={t('clients.view')} />
          <Button
            onClick={onCreate}
            className="action-brand min-h-11 shrink-0 whitespace-nowrap rounded-xl border-2 px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0"
            variant="ghost"
          >
            {t('clients.new')}
          </Button>
        </div>
      </div>

      {errorKey && (
        <Alert type="error" icon="⚠️" onClose={() => setErrorKey(null)}>
          {t(errorKey)}
        </Alert>
      )}

      {searching && !initialLoading && (
        <LoadingState
          role="status"
          aria-live="polite"
          size="sm"
          message={t('clients.searching')}
          className="flex-row justify-start py-1"
        />
      )}

      <div aria-busy={initialLoading || searching}>
        {initialLoading ? (
          <Panel className="clients-state-panel" data-testid="clients-loading-state">
            <LoadingState message={t('clients.loading')} />
          </Panel>
        ) : clients.length === 0 ? (
          <Panel className="clients-state-panel">
            <EmptyState
              icon="👥"
              title={t('clients.emptyTitle')}
              description={t('clients.emptyDescription')}
            />
          </Panel>
        ) : viewMode === 'table' ? (
          <div
            className="w-full max-w-full overflow-x-auto rounded-xl border border-border-subtle bg-bg-primary/60"
            data-testid="client-table-container"
          >
            <table className="w-full min-w-[640px] text-left text-sm" data-testid="client-table">
              <caption className="sr-only">{t('clients.listCaption')}</caption>
              <thead className="table-head border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    {t('clients.name')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('clients.email')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('clients.phone')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('clients.organization')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
                {clients.map((client) => (
                  <Fragment key={client.id}>
                    <tr
                      className={confirmDelete === client.id ? 'bg-priority-high/5' : 'table-row'}
                    >
                      <td className="px-4 py-3.5 font-medium">{client.name}</td>
                      <td className="px-4 py-3.5 text-fg-muted">{client.email}</td>
                      <td className="px-4 py-3.5 text-fg-muted">{client.phone}</td>
                      <td className="px-4 py-3.5 text-fg-muted">{client.organization || '—'}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={editActionButtonClass}
                            onClick={() => onEdit?.(client)}
                            disabled={confirmDelete !== null}
                            aria-label={t('clients.editNamed', { name: client.name })}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={deleteActionButtonClass}
                            onClick={() => setConfirmDelete(client.id)}
                            disabled={confirmDelete !== null || deleting === client.id}
                            aria-label={t('clients.deleteNamed', { name: client.name })}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {confirmDelete === client.id && (
                      <tr key={`${client.id}-delete`}>
                        <td
                          colSpan={5}
                          className="bg-priority-high/10 px-4 py-3"
                          data-testid="delete-confirmation"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-fg-primary">
                              {t('clients.confirmDelete', { name: client.name })}
                            </p>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="action-surface rounded-lg border transition-colors duration-200"
                                onClick={() => setConfirmDelete(null)}
                                disabled={deleting === client.id}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={deleteActionButtonClass}
                                onClick={() => handleDelete(client.id)}
                                isLoading={deleting === client.id}
                              >
                                {t('common.delete')}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="client-cards">
            {clients.map((client) => (
              <div key={client.id}>
                {confirmDelete === client.id && (
                  <Panel
                    className="mb-3 border border-priority-high bg-priority-high/10"
                    data-testid="delete-confirmation"
                  >
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-fg-primary">
                        {t('clients.confirmDelete', { name: client.name })}
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-surface rounded-lg border transition-colors duration-200"
                          onClick={() => setConfirmDelete(null)}
                          disabled={deleting === client.id}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={deleteActionButtonClass}
                          onClick={() => handleDelete(client.id)}
                          isLoading={deleting === client.id}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </Panel>
                )}
                <Panel
                  className={
                    confirmDelete === client.id
                      ? 'border border-border-subtle opacity-50'
                      : 'border border-border-subtle transition-colors hover:border-accent-brand/50'
                  }
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold text-fg-primary">
                        {client.name}
                      </h3>
                      <p className="text-sm text-fg-muted">{client.email}</p>
                      <p className="text-sm text-fg-muted">{client.phone}</p>
                      {client.organization && (
                        <p className="mt-1 text-xs text-fg-muted">{client.organization}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={editActionButtonClass}
                        onClick={() => onEdit?.(client)}
                        disabled={confirmDelete !== null}
                        aria-label={t('clients.editNamed', { name: client.name })}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={deleteActionButtonClass}
                        onClick={() => setConfirmDelete(client.id)}
                        disabled={confirmDelete !== null || deleting === client.id}
                        aria-label={t('clients.deleteNamed', { name: client.name })}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                </Panel>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
