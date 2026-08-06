import { useState, useEffect } from 'react';
import type { Client } from '@ijac/shared';
import { listClients, deleteClient } from '../../lib/resources';

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

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    setDeleting(id);
    try {
      await deleteClient(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Cargando clientes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clientes..."
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 sm:w-72"
        />
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light"
        >
          Nuevo cliente
        </button>
      </div>

      {error && <div className="rounded-md bg-red-900/30 px-3 py-2 text-red-200">{error}</div>}

      {clients.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          No hay clientes para mostrar.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-slate-100">{client.name}</h3>
                  <p className="text-sm text-slate-400">{client.email}</p>
                  <p className="text-sm text-slate-500">{client.phone}</p>
                  {client.organization && (
                    <p className="mt-1 text-xs text-slate-500">{client.organization}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit?.(client)}
                    className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    aria-label={`Editar ${client.name}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client.id)}
                    disabled={deleting === client.id}
                    className="rounded-md px-2 py-1 text-xs text-red-300 hover:bg-red-900/30 disabled:opacity-50"
                    aria-label={`Eliminar ${client.name}`}
                  >
                    {deleting === client.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
