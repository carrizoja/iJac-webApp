import { useState, useEffect } from 'react';
import { getCalendarConnectionStatus, startCalendarConnection } from '../../lib/calendar';

export function CalendarConnection() {
  const [status, setStatus] = useState<{ connected: boolean; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const result = await getCalendarConnectionStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar estado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await startCalendarConnection();
      window.location.href = result.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar conexión');
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Consultando estado de Google Calendar...</div>;
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-lg font-medium text-slate-100">Conexión con Google Calendar</h2>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status?.connected ? 'bg-green-500' : 'bg-slate-500'
          }`}
          aria-hidden="true"
        />
        <span className="text-slate-300">
          {status?.connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      {error && (
        <div className="mt-2 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-200" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {!status?.connected && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          aria-busy={connecting}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {connecting ? 'Conectando...' : 'Conectar con Google Calendar'}
        </button>
      )}
    </div>
  );
}
