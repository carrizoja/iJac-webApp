import { useState, useEffect } from 'react';
import { getCalendarConnectionStatus, startCalendarConnection } from '../../lib/calendar';
import { Button, Alert, Panel, LoadingState } from '../ui';

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
    return <LoadingState>Consultando estado de Google Calendar...</LoadingState>;
  }

  return (
    <Panel>
      <h2 className="text-lg font-medium text-fg-primary">Conexión con Google Calendar</h2>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status?.connected ? 'bg-status-success' : 'bg-fg-muted'
          }`}
          aria-hidden="true"
        />
        <span className="text-fg-muted">
          {status?.connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      {error && (
        <Alert type="error" icon="⚠️" onClose={() => setError(null)} className="mt-2" role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}
      {!status?.connected && (
        <Button
          onClick={handleConnect}
          isLoading={connecting}
          aria-busy={connecting}
          className="mt-4"
        >
          {connecting ? 'Conectando...' : 'Conectar con Google Calendar'}
        </Button>
      )}
    </Panel>
  );
}
