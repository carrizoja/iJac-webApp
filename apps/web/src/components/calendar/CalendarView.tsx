import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CalendarEvent } from '@ijac/shared';
import { listCalendarEvents, syncCalendar } from '../../lib/calendar';
import { Button, Alert, EmptyState, LoadingState, Panel } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { formatMonthYear } from '../../i18n/format';
import type { TranslationKey } from '../../i18n/translations';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const statusColorClass: Record<string, string> = {
  open: 'bg-status-open',
  'in-progress': 'bg-status-in-progress',
  completed: 'bg-status-completed',
  cancelled: 'bg-status-cancelled',
};

export function CalendarView() {
  const { language, t } = useLanguage();
  const neutralControlButtonClass =
    'action-surface rounded-lg border transition-colors duration-200';
  const primaryActionButtonClass =
    'action-brand rounded-lg border-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    attempted: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const result = await listCalendarEvents(toIsoDate(start), toIsoDate(end));
      setEvents(result);
    } catch {
      setErrorKey('calendar.loadError');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const startDayOfWeek = start.getDay();
    const gridStart = addDays(start, -startDayOfWeek);
    const daysArray: Date[] = [];
    for (let i = 0; i < 42; i++) {
      daysArray.push(addDays(gridStart, i));
    }
    return daysArray;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = event.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const monthLabel = formatMonthYear(currentMonth, language);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setErrorKey(null);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const result = await syncCalendar(toIsoDate(start), toIsoDate(end));
      setSyncResult(result);
    } catch {
      setErrorKey('calendar.syncError');
    } finally {
      setSyncing(false);
    }
  };

  const syncAlert = syncResult
    ? syncResult.failed === 0
      ? { type: 'success' as const, icon: '✓', role: 'status' as const }
      : syncResult.succeeded === 0
        ? { type: 'error' as const, icon: '⚠️', role: 'alert' as const }
        : { type: 'warning' as const, icon: '⚠️', role: 'status' as const }
    : null;

  if (loading) {
    return (
      <Panel className="calendar-state-panel" data-testid="calendar-loading-state">
        <LoadingState message={t('calendar.loading')} />
      </Panel>
    );
  }

  return (
    <div className="space-y-5" data-testid="calendar-view">
      {errorKey && !syncResult && (
        <Alert
          type="error"
          icon="⚠️"
          onClose={() => setErrorKey(null)}
          role="alert"
          aria-live="assertive"
        >
          {t(errorKey)}
        </Alert>
      )}
      <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium capitalize text-fg-primary">{monthLabel}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={neutralControlButtonClass}
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
            }
          >
            {t('calendar.previous')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={neutralControlButtonClass}
            onClick={() => setCurrentMonth(new Date())}
          >
            {t('calendar.today')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={neutralControlButtonClass}
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
            }
          >
            {t('calendar.next')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={primaryActionButtonClass}
            onClick={handleSync}
            isLoading={syncing}
            aria-busy={syncing}
          >
            {syncing ? t('calendar.syncing') : t('calendar.sync')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-fg-muted">
        {(
          [
            'weekday.sun',
            'weekday.mon',
            'weekday.tue',
            'weekday.wed',
            'weekday.thu',
            'weekday.fri',
            'weekday.sat',
          ] as const
        ).map((key) => (
          <div key={key}>{t(key)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(toIsoDate(day)) ?? [];
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[6rem] rounded-md border p-2 ${
                isCurrentMonth
                  ? 'border-border-primary bg-bg-secondary'
                  : 'border-border-muted bg-bg-tertiary'
              }`}
            >
              <div
                className={`text-right text-sm ${isCurrentMonth ? 'text-fg-primary' : 'text-fg-muted'}`}
              >
                {day.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <a
                    key={event.id}
                    href={`/work-orders/details?id=${encodeURIComponent(event.workOrderId)}`}
                    className="flex items-center gap-1 truncate rounded bg-bg-accent/40 px-1.5 py-0.5 text-xs text-fg-primary transition-colors hover:bg-bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    aria-label={t('calendar.viewDetails', { name: event.title })}
                    title={t('calendar.viewDetails', { name: event.title })}
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusColorClass[event.status] ?? 'bg-fg-muted'}`}
                      aria-hidden="true"
                    />
                    {event.title}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {syncResult && syncAlert && (
        <Alert
          type={syncAlert.type}
          icon={syncAlert.icon}
          role={syncAlert.role}
          aria-live={syncAlert.role === 'alert' ? 'assertive' : 'polite'}
        >
          {t('calendar.syncSummary', {
            succeeded: syncResult.succeeded,
            succeededLabel: t(
              syncResult.succeeded === 1 ? 'calendar.succeededOne' : 'calendar.succeededMany',
            ),
            failed: syncResult.failed,
            failedLabel: t(syncResult.failed === 1 ? 'calendar.failedOne' : 'calendar.failedMany'),
            attempted: syncResult.attempted,
            attemptedLabel: t(
              syncResult.attempted === 1 ? 'calendar.attemptedOne' : 'calendar.attemptedMany',
            ),
          })}
        </Alert>
      )}

      {events.length === 0 && (
        <Panel className="calendar-state-panel">
          <EmptyState
            icon="📅"
            title={t('calendar.emptyTitle')}
            description={t('calendar.emptyDescription')}
          />
        </Panel>
      )}
    </div>
  );
}
