import { useState, useEffect } from 'react';
import { getCalendarConnectionStatus, startCalendarConnection } from '../../lib/calendar';
import { Button, Alert, Panel, LoadingState } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import type { TranslationKey } from '../../i18n/translations';

export function CalendarConnection() {
  const { t } = useLanguage();
  const primaryActionButtonClass =
    'action-brand rounded-xl border-2 px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0';
  const [status, setStatus] = useState<{ connected: boolean; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<'success' | 'error' | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const result = await getCalendarConnectionStatus();
      setStatus(result);
    } catch {
      setErrorKey('calendar.statusError');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const connection = url.searchParams.get('connection');
      if (connection === 'success' || connection === 'error') {
        setConnectionFeedback(connection);
        url.searchParams.delete('connection');
        window.history.replaceState(
          window.history.state,
          '',
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    }
    loadStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorKey(null);
    try {
      const result = await startCalendarConnection();
      window.location.href = result.authorizationUrl;
    } catch {
      setErrorKey('calendar.connectionStartError');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Panel className="calendar-state-panel" data-testid="calendar-connection-loading-state">
        <LoadingState message={t('calendar.checking')} />
      </Panel>
    );
  }

  return (
    <Panel
      className="rounded-xl border border-border-subtle bg-bg-primary/70 p-4 sm:p-6"
      data-testid="calendar-connection-panel"
    >
      <h2 className="text-lg font-medium text-fg-primary">{t('calendar.connectionTitle')}</h2>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status?.connected ? 'bg-status-success' : 'bg-fg-muted'
          }`}
          aria-hidden="true"
        />
        <span className="text-fg-muted">
          {status?.connected ? t('calendar.connected') : t('calendar.disconnected')}
        </span>
      </div>
      {connectionFeedback === 'success' && (
        <Alert type="success" icon="✓" className="mt-2" role="status" aria-live="polite">
          {t('calendar.connectionSuccess')}
        </Alert>
      )}
      {connectionFeedback === 'error' && (
        <Alert type="error" icon="⚠️" className="mt-2" role="alert" aria-live="assertive">
          {t('calendar.connectionError')}
        </Alert>
      )}
      {errorKey && (
        <Alert
          type="error"
          icon="⚠️"
          onClose={() => setErrorKey(null)}
          className="mt-2"
          role="alert"
          aria-live="assertive"
        >
          {t(errorKey)}
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
          {connecting ? t('calendar.connecting') : t('calendar.connect')}
        </Button>
      )}
    </Panel>
  );
}
