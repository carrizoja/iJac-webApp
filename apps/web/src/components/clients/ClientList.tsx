import { useState, useEffect, useCallback } from 'react';
import type { Client } from '@ijac/shared';
import { listClients, deleteClient } from '../../lib/resources';
import { Input, Button, Alert, EmptyState, LoadingState, Panel } from '../ui';

interface ClientListProps {
  onCreate?: () => void;
  onEdit?: (client: Client) => void;
}

export function ClientList({ onCreate, onEdit }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listClients({ search });
      setClients(Array.isArray(result?.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteClient(id);
      await load();
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <LoadingState>Cargando clientes...</LoadingState>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clientes..."
          className="w-full sm:w-72"
        />
        <Button onClick={onCreate}>
          Nuevo cliente
        </Button>
      </div>

      {error && (
        <Alert type="error" icon="⚠️" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No hay clientes"
          description="Crea tu primer cliente para comenzar"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id}>
              {confirmDelete === client.id && (
                <Panel className="mb-3 border border-status-warning bg-status-warning/10">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-fg-primary">
                      ¿Eliminar cliente "{client.name}"?
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleting === client.id}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
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
                className={confirmDelete === client.id ? 'opacity-50' : ''}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-fg-primary">{client.name}</h3>
                    <p className="text-sm text-fg-muted">{client.email}</p>
                    <p className="text-sm text-fg-muted">{client.phone}</p>
                    {client.organization && (
                      <p className="mt-1 text-xs text-fg-muted">{client.organization}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit?.(client)}
                      disabled={confirmDelete !== null}
                      aria-label={`Editar ${client.name}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
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
  );
}
