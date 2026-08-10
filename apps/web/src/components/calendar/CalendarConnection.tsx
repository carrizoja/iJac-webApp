import { useState, useEffect } from 'react';
import { getCalendarConnectionStatus, startCalendarConnection } from '../../lib/calendar';
import { Button, Alert, Panel, LoadingState } from '../ui';

export function CalendarConnection() {
  const primaryActionButtonClass =
    'rounded-xl border-2 border-[#00d084] bg-[#080808] px-6 text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#00c978] hover:bg-[#00c978] hover:text-white hover:shadow-[0_0_0_1px_#00c978,0_10px_28px_rgba(0,201,120,0.45)] active:translate-y-0 active:shadow-[0_0_0_1px_#00c978,0_6px_16px_rgba(0,201,120,0.35)]';
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
    return (
      <Panel className="calendar-state-panel" data-testid="calendar-connection-loading-state">
        <LoadingState message="Consultando estado de Google Calendar..." />
      </Panel>
    );
  }

  return (
    <Panel className="rounded-xl border border-border-subtle bg-bg-primary/70 p-4 sm:p-6" data-testid="calendar-connection-panel">
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
          className={`mt-4 min-h-11 ${primaryActionButtonClass}`}
          variant="ghost"
        >
          {connecting ? 'Conectando...' : 'Conectar con Google Calendar'}
        </Button>
      )}
    </Panel>
  );
}
