import { useState, useEffect, useMemo } from 'react';
import type { CalendarEvent } from '@ijac/shared';
import { listCalendarEvents, syncCalendar } from '../../lib/calendar';

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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const statusColorClass: Record<string, string> = {
  open: 'bg-status-open',
  'in-progress': 'bg-status-in-progress',
  completed: 'bg-status-completed',
  cancelled: 'bg-status-cancelled',
};

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ attempted: number; succeeded: number; failed: number } | null>(null);

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, [currentMonth]);

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

  if (loading) return <div className="text-slate-400">Cargando calendario...</div>;

  return (
    <div className="space-y-4">
      {error && !syncResult && (
        <div className="rounded-md bg-red-900/30 px-3 py-2 text-red-200" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium capitalize text-slate-100">{monthLabel}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            Siguiente
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            aria-busy={syncing}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar con Google'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
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
                isCurrentMonth ? 'border-slate-800 bg-slate-900/30' : 'border-slate-900/50 bg-slate-950/50'
              }`}
            >
              <div className={`text-right text-sm ${isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
                {day.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <a
                    key={event.id}
                    href={`/work-orders/${event.workOrderId}`}
                    className="flex items-center gap-1 truncate rounded bg-accent/40 px-1.5 py-0.5 text-xs text-slate-100 hover:bg-accent/60"
                    title={event.title}
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusColorClass[event.status] ?? 'bg-slate-500'}`}
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
        <div className="rounded-md bg-green-900/30 px-3 py-2 text-sm text-green-200" role="status" aria-live="polite">
          Sincronización: {syncResult.succeeded} de {syncResult.attempted} exitosas
          {syncResult.failed > 0 && ` (${syncResult.failed} fallidas)`}
        </div>
      )}

      {events.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
          No hay órdenes con fecha de vencimiento este mes.
        </div>
      )}
    </div>
  );
}
