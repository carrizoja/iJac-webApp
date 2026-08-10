import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CalendarEvent } from '@ijac/shared';
import { listCalendarEvents, syncCalendar } from '../../lib/calendar';
import { Button, Alert, EmptyState, LoadingState, Panel } from '../ui';

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
  return date.toISOString().slice(0, 10);
}

const statusColorClass: Record<string, string> = {
  open: 'bg-status-open',
  'in-progress': 'bg-status-in-progress',
  completed: 'bg-status-completed',
  cancelled: 'bg-status-cancelled',
};

export function CalendarView() {
  const neutralControlButtonClass =
    'rounded-lg border border-[#2f2f2f] bg-[#080808] text-white transition-colors duration-200 hover:border-[#3a3a3a] hover:bg-[#0f0f0f]';
  const primaryActionButtonClass =
    'rounded-lg border-2 border-[#00d084] bg-[#080808] text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#00c978] hover:bg-[#00c978] hover:text-white hover:shadow-[0_0_0_1px_#00c978,0_10px_28px_rgba(0,201,120,0.45)] active:translate-y-0 active:shadow-[0_0_0_1px_#00c978,0_6px_16px_rgba(0,201,120,0.35)]';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ attempted: number; succeeded: number; failed: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const result = await listCalendarEvents(toIsoDate(start), toIsoDate(end));
      setEvents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar calendario');
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

  const monthLabel = currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const result = await syncCalendar(toIsoDate(start), toIsoDate(end));
      setSyncResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Panel className="calendar-state-panel" data-testid="calendar-loading-state">
        <LoadingState message="Cargando calendario..." />
      </Panel>
    );
  }

  return (
    <div className="space-y-5" data-testid="calendar-view">
      {error && !syncResult && (
        <Alert type="error" icon="⚠️" onClose={() => setError(null)} role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}
      <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium capitalize text-fg-primary">{monthLabel}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={neutralControlButtonClass}
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={neutralControlButtonClass}
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={neutralControlButtonClass}
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            Siguiente
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={primaryActionButtonClass}
            onClick={handleSync}
            isLoading={syncing}
            aria-busy={syncing}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar con Google'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-fg-muted">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
          <div key={d}>{d}</div>
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
                isCurrentMonth ? 'border-border-primary bg-bg-secondary' : 'border-border-muted bg-bg-tertiary'
              }`}
            >
              <div className={`text-right text-sm ${isCurrentMonth ? 'text-fg-primary' : 'text-fg-muted'}`}>
                {day.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <a
                    key={event.id}
                    href={`/work-orders/${event.workOrderId}`}
                    className="flex items-center gap-1 truncate rounded bg-bg-accent/40 px-1.5 py-0.5 text-xs text-fg-primary hover:bg-bg-accent/60 transition-colors"
                    title={event.title}
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

      {syncResult && (
        <Alert type="success" icon="✓" role="status" aria-live="polite">
          Sincronización: {syncResult.succeeded} de {syncResult.attempted} exitosas
          {syncResult.failed > 0 && ` (${syncResult.failed} fallidas)`}
        </Alert>
      )}

      {events.length === 0 && (
        <Panel className="calendar-state-panel">
          <EmptyState
            icon="📅"
            title="Sin eventos"
            description="No hay órdenes con fecha de vencimiento este mes"
          />
        </Panel>
      )}
    </div>
  );
}
