import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import type { Client } from '@ijac/shared';
import { listClients, deleteClient } from '../../lib/resources';
import { Input, Button, Alert, EmptyState, LoadingState, Panel, ViewModeToggle, type ViewMode } from '../ui';

interface ClientListProps {
  onCreate?: () => void;
  onEdit?: (client: Client) => void;
}

export function ClientList({ onCreate, onEdit }: ClientListProps) {
  const neonActionButtonBaseClass =
    'rounded-lg border-2 bg-[#080808] px-4 text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white active:translate-y-0';
  const editActionButtonClass =
    `${neonActionButtonBaseClass} border-[#22d3ee] hover:border-[#06b6d4] hover:bg-[#06b6d4] hover:shadow-[0_0_0_1px_#06b6d4,0_10px_28px_rgba(6,182,212,0.42)] active:shadow-[0_0_0_1px_#06b6d4,0_6px_16px_rgba(6,182,212,0.35)]`;
  const deleteActionButtonClass =
    `${neonActionButtonBaseClass} border-[#f87171] hover:border-[#ef4444] hover:bg-[#ef4444] hover:shadow-[0_0_0_1px_#ef4444,0_10px_28px_rgba(239,68,68,0.42)] active:shadow-[0_0_0_1px_#ef4444,0_6px_16px_rgba(239,68,68,0.35)]`;
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const latestRequestId = useRef(0);
  const hasRequested = useRef(false);

  const load = useCallback(async (searchTerm: string, background = false) => {
    const requestId = ++latestRequestId.current;
    if (background) setSearching(true);
    setError(null);
    try {
      const result = await listClients({ search: searchTerm });
      if (requestId !== latestRequestId.current) return;
      setClients(Array.isArray(result?.items) ? result.items : []);
    } catch (err) {
      if (requestId !== latestRequestId.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
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
          placeholder="Buscar clientes..."
          className="w-full rounded-xl sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <ViewModeToggle value={viewMode} onChange={setViewMode} ariaLabel="Vista de clientes" />
          <Button
            onClick={onCreate}
            className="min-h-11 shrink-0 whitespace-nowrap rounded-xl border-2 border-[#00d084] bg-[#080808] px-6 text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#00c978] hover:bg-[#00c978] hover:text-white hover:shadow-[0_0_0_1px_#00c978,0_10px_28px_rgba(0,201,120,0.45)] active:translate-y-0 active:shadow-[0_0_0_1px_#00c978,0_6px_16px_rgba(0,201,120,0.35)]"
            variant="ghost"
          >
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" icon="⚠️" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {searching && !initialLoading && (
        <LoadingState
          role="status"
          aria-live="polite"
          size="sm"
          message="Buscando clientes..."
          className="flex-row justify-start py-1"
        />
      )}

      <div aria-busy={initialLoading || searching}>
        {initialLoading ? (
          <Panel className="clients-state-panel" data-testid="clients-loading-state">
            <LoadingState message="Cargando clientes..." />
          </Panel>
        ) : clients.length === 0 ? (
          <Panel className="clients-state-panel">
            <EmptyState
              icon="👥"
              title="No hay clientes"
              description="Crea tu primer cliente para comenzar"
            />
          </Panel>
        ) : viewMode === 'table' ? (
          <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border-subtle bg-bg-primary/60" data-testid="client-table-container">
            <table className="w-full min-w-[640px] text-left text-sm" data-testid="client-table">
              <caption className="sr-only">Lista de clientes</caption>
              <thead className="border-b border-border-subtle bg-[#080808]/80 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Nombre</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Teléfono</th>
                  <th scope="col" className="px-4 py-3">Organización</th>
                  <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 text-fg-primary">
                {clients.map((client) => (
                  <Fragment key={client.id}>
                    <tr className={confirmDelete === client.id ? 'bg-priority-high/5' : 'hover:bg-[#080808]/40'}>
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
                            aria-label={`Editar ${client.name}`}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={deleteActionButtonClass}
                            onClick={() => setConfirmDelete(client.id)}
                            disabled={confirmDelete !== null || deleting === client.id}
                            aria-label={`Eliminar ${client.name}`}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {confirmDelete === client.id && (
                      <tr key={`${client.id}-delete`}>
                        <td colSpan={5} className="bg-priority-high/10 px-4 py-3" data-testid="delete-confirmation">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-fg-primary">
                              ¿Eliminar cliente "{client.name}"?
                            </p>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg border border-[#2f2f2f] bg-[#080808] text-white transition-colors duration-200 hover:border-[#3a3a3a] hover:bg-[#0f0f0f]"
                                onClick={() => setConfirmDelete(null)}
                                disabled={deleting === client.id}
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={deleteActionButtonClass}
                                onClick={() => handleDelete(client.id)}
                                isLoading={deleting === client.id}
                              >
                                Eliminar
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
                  <Panel className="mb-3 border border-priority-high bg-priority-high/10" data-testid="delete-confirmation">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-fg-primary">
                        ¿Eliminar cliente "{client.name}"?
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg border border-[#2f2f2f] bg-[#080808] text-white transition-colors duration-200 hover:border-[#3a3a3a] hover:bg-[#0f0f0f]"
                          onClick={() => setConfirmDelete(null)}
                          disabled={deleting === client.id}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={deleteActionButtonClass}
                          onClick={() => handleDelete(client.id)}
                          isLoading={deleting === client.id}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Panel>
                )}
                <Panel
                  className={confirmDelete === client.id ? 'border border-border-subtle opacity-50' : 'border border-border-subtle transition-colors hover:border-accent-brand/50'}
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold text-fg-primary">{client.name}</h3>
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
                        aria-label={`Editar ${client.name}`}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={deleteActionButtonClass}
                        onClick={() => setConfirmDelete(client.id)}
                        disabled={confirmDelete !== null || deleting === client.id}
                        aria-label={`Eliminar ${client.name}`}
                      >
                        Eliminar
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
