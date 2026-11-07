import { useState, useEffect, useMemo, useCallback } from 'react';
import { WorkOrderStatus, type CalendarEvent } from '@ijac/shared';
import { listCalendarEvents, syncCalendar } from '../../lib/calendar';
import { Button, Alert, EmptyState, LoadingState, Panel } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDateOnly, formatMonthYear, formatWeekdayDate, statusLabel } from '../../i18n/format';
import { isOverdue, localDateKey } from '../home/todaySummary';
import type { TranslationKey } from '../../i18n/translations';
import { CalendarDays, Check, TriangleAlert } from 'lucide-react';

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

/** Statuses in the order they appear in the legend. */
const legendStatuses = [
  WorkOrderStatus.OPEN,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.CANCELLED,
] as const;

/** Weeks start on Monday, as in Argentina. */
const weekdayKeys = [
  'weekday.mon',
  'weekday.tue',
  'weekday.wed',
  'weekday.thu',
  'weekday.fri',
  'weekday.sat',
  'weekday.sun',
] as const;

export function CalendarView() {
  const { language, t } = useLanguage();
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
    // Days since the last Monday: getDay() counts from Sunday (0).
    const daysSinceMonday = (start.getDay() + 6) % 7;
    const gridStart = addDays(start, -daysSinceMonday);
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
  const todayKey = localDateKey(new Date());

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
      ? {
          type: 'success' as const,
          icon: <Check aria-hidden="true" className="h-4 w-4" />,
          role: 'status' as const,
        }
      : syncResult.succeeded === 0
        ? {
            type: 'error' as const,
            icon: <TriangleAlert aria-hidden="true" className="h-4 w-4" />,
            role: 'alert' as const,
          }
        : {
            type: 'warning' as const,
            icon: <TriangleAlert aria-hidden="true" className="h-4 w-4" />,
            role: 'status' as const,
          }
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
          icon={<TriangleAlert aria-hidden="true" className="h-4 w-4" />}
          onClose={() => setErrorKey(null)}
          action={
            errorKey === 'calendar.loadError'
              ? { label: t('common.retry'), onClick: () => void load() }
              : undefined
          }
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
            variant="secondary"
            size="sm"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
            }
          >
            {t('calendar.previous')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date())}>
            {t('calendar.today')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
            }
          >
            {t('calendar.next')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSync}
            isLoading={syncing}
            aria-busy={syncing}
          >
            {syncing ? t('calendar.syncing') : t('calendar.sync')}
          </Button>
        </div>
      </div>

      <div
        className="hidden grid-cols-7 gap-1 text-center text-xs text-fg-muted sm:grid"
        data-testid="calendar-weekdays"
      >
        {weekdayKeys.map((key) => (
          <div key={key}>{t(key)}</div>
        ))}
      </div>

      {/* A 7-column grid from `sm` up; on phones, a list of the days that have orders. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7 sm:gap-1">
        {days.map((day) => {
          const dayKey = toIsoDate(day);
          const dayEvents = eventsByDay.get(dayKey) ?? [];
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              data-testid="calendar-day"
              data-date={dayKey}
              aria-current={isToday ? 'date' : undefined}
              className={`rounded-md border p-2 sm:min-h-[6rem] ${
                dayEvents.length === 0 ? 'hidden sm:block' : ''
              } ${
                isToday
                  ? 'border-focus bg-bg-secondary ring-1 ring-focus'
                  : isCurrentMonth
                    ? 'border-border-primary bg-bg-secondary'
                    : 'border-border-muted bg-bg-tertiary'
              }`}
            >
              <div
                className={`hidden text-right text-sm sm:block ${
                  isToday
                    ? 'font-semibold text-focus'
                    : isCurrentMonth
                      ? 'text-fg-primary'
                      : 'text-fg-muted'
                }`}
              >
                {day.getDate()}
              </div>
              <div
                className={`text-sm font-medium first-letter:uppercase sm:hidden ${
                  isToday ? 'text-focus' : 'text-fg-primary'
                }`}
              >
                {formatWeekdayDate(day, language)}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => {
                  const overdue = isOverdue(event, todayKey);
                  const details = [
                    t('calendar.viewDetails', { name: event.title }),
                    formatDateOnly(dayKey, language),
                    statusLabel(event.status, language),
                    ...(overdue ? [t('workOrders.overdue')] : []),
                  ];
                  return (
                    <a
                      key={event.id}
                      href={`/work-orders/details?id=${encodeURIComponent(event.workOrderId)}`}
                      data-overdue={overdue ? 'true' : undefined}
                      className={`flex items-center gap-1 truncate rounded bg-bg-accent/40 px-1.5 py-1 text-sm text-fg-primary transition-colors hover:bg-bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:py-0.5 sm:text-xs ${
                        overdue ? 'ring-1 ring-inset ring-destructive-text' : ''
                      }`}
                      // The grid cell is not announced, so the link names its day and status.
                      aria-label={details.join(', ')}
                      title={t('calendar.viewDetails', { name: event.title })}
                    >
                      <span
                        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusColorClass[event.status] ?? 'bg-fg-muted'}`}
                        aria-hidden="true"
                      />
                      {event.title}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ul
        aria-label={t('calendar.legend')}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-secondary"
      >
        {legendStatuses.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusColorClass[status]}`}
              aria-hidden="true"
            />
            {statusLabel(status, language)}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded ring-1 ring-inset ring-destructive-text"
            aria-hidden="true"
          />
          {t('workOrders.overdue')}
        </li>
      </ul>

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
            icon={<CalendarDays aria-hidden="true" className="h-10 w-10" />}
            title={t('calendar.emptyTitle')}
            description={t('calendar.emptyDescription')}
          />
        </Panel>
      )}
    </div>
  );
}
