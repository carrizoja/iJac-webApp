import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { WorkOrderPriority, WorkOrderStatus } from '@ijac/shared';

const { listCalendarEvents, syncCalendar } = vi.hoisted(() => ({
  listCalendarEvents: vi.fn(),
  syncCalendar: vi.fn(),
}));

vi.mock('../../lib/calendar', () => ({ listCalendarEvents, syncCalendar }));

import { CalendarView } from './CalendarView';
import { setLanguage } from '../../i18n/language';

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const dueDate = new Date();
    dueDate.setDate(15);
    dueDate.setHours(12, 0, 0, 0);
    listCalendarEvents.mockResolvedValue([
      {
        id: 'event-1',
        workOrderId: 'work/order ? 1',
        title: 'Revisión remota',
        dueDate: dueDate.toISOString(),
        status: WorkOrderStatus.OPEN,
        priority: WorkOrderPriority.NORMAL,
      },
    ]);
    syncCalendar.mockResolvedValue({ attempted: 1, succeeded: 1, failed: 0 });
  });

  it('says what syncing does, and the sync button reads it as its description', async () => {
    render(<CalendarView />);
    const sync = await screen.findByRole('button', { name: 'Sincronizar con Google' });
    const help =
      'Envía a tu Google Calendar las órdenes que vencen en el mes que estás viendo, como eventos de todo el día. Volver a sincronizar las actualiza; los cambios hechos en Google no vuelven a iJac.';
    expect(screen.getByText(help)).toBeInTheDocument();
    expect(sync).toHaveAccessibleDescription(help);
  });

  it('links events to the static details route with an encoded ID', async () => {
    render(<CalendarView />);

    const link = await screen.findByRole('link', { name: /^Ver detalles de Revisión remota/ });

    expect(link).toHaveAttribute('href', '/work-orders/details?id=work%2Forder%20%3F%201');
    expect(link).toHaveAttribute('title', 'Ver detalles de Revisión remota');
  });

  it('names the day and status of each event, since the grid cell is not announced', async () => {
    const day = new Date();
    day.setDate(15);
    // Pin today before the 15th, so the open event is never overdue whatever day this runs.
    const beforeDue = new Date(day);
    beforeDue.setDate(10);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(beforeDue);
    try {
      render(<CalendarView />);
      const spoken = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(day);

      expect(
        await screen.findByRole('link', {
          name: `Ver detalles de Revisión remota, ${spoken}, Abierta`,
        }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads the month again when Reintentar is pressed after a failure', async () => {
    listCalendarEvents.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
    render(<CalendarView />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo cargar el calendario.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('link', { name: /^Ver detalles de Revisión remota/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    [
      { attempted: 2, succeeded: 2, failed: 0 },
      'status',
      'text-status-completed',
      /2 exitosas, 0 fallidas de 2 intentadas/i,
    ],
    [
      { attempted: 2, succeeded: 1, failed: 1 },
      'status',
      'text-warning',
      /1 exitosa, 1 fallida de 2 intentadas/i,
    ],
    [
      { attempted: 1, succeeded: 0, failed: 1 },
      'alert',
      'text-destructive-text',
      /0 exitosas, 1 fallida de 1 intentada/i,
    ],
  ])(
    'renders truthful accessible sync feedback for %o',
    async (result, role, severityClass, message) => {
      syncCalendar.mockResolvedValue(result);
      render(<CalendarView />);

      fireEvent.click(await screen.findByRole('button', { name: 'Sincronizar con Google' }));

      const feedback = await screen.findByRole(role);
      expect(feedback).toHaveTextContent(message);
      expect(feedback).toHaveClass(severityClass);
    },
  );

  it('uses natural English sync copy for singular counts', async () => {
    setLanguage('en');
    syncCalendar.mockResolvedValue({ attempted: 1, succeeded: 1, failed: 0 });
    render(<CalendarView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sync with Google' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sync: 1 succeeded, 0 failed out of 1 attempted.',
    );
  });

  describe('on a fixed day', () => {
    beforeEach(() => {
      setLanguage('es');
      // Friday 20 November 2026; only Date is faked so promises and timers still run.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 20, 10, 0));
      listCalendarEvents.mockResolvedValue([
        {
          id: 'late',
          workOrderId: 'late',
          title: 'Atrasada',
          dueDate: '2026-11-18T12:00:00.000Z',
          status: WorkOrderStatus.IN_PROGRESS,
          priority: WorkOrderPriority.NORMAL,
        },
        {
          id: 'done',
          workOrderId: 'done',
          title: 'Terminada',
          dueDate: '2026-11-18T12:00:00.000Z',
          status: WorkOrderStatus.COMPLETED,
          priority: WorkOrderPriority.NORMAL,
        },
        {
          id: 'soon',
          workOrderId: 'soon',
          title: 'Próxima',
          dueDate: '2026-11-25T12:00:00.000Z',
          status: WorkOrderStatus.OPEN,
          priority: WorkOrderPriority.NORMAL,
        },
      ]);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts the week on Monday, as in Argentina', async () => {
      render(<CalendarView />);
      await screen.findByTestId('calendar-view');

      const weekdays = within(screen.getByTestId('calendar-weekdays')).getAllByText(/./);
      expect(weekdays.map((cell) => cell.textContent)).toEqual([
        'Lun',
        'Mar',
        'Mié',
        'Jue',
        'Vie',
        'Sáb',
        'Dom',
      ]);
      // November 2026 starts on a Sunday, so the grid opens on Monday 26 October.
      expect(screen.getAllByTestId('calendar-day')[0]).toHaveAttribute('data-date', '2026-10-26');
    });

    it('marks today, and only today', async () => {
      render(<CalendarView />);
      await screen.findByTestId('calendar-view');

      const current = screen
        .getAllByTestId('calendar-day')
        .filter((cell) => cell.getAttribute('aria-current') === 'date');
      expect(current).toHaveLength(1);
      expect(current[0]).toHaveAttribute('data-date', '2026-11-20');
    });

    it('marks today with the brand accent, not the focus ring color', async () => {
      render(<CalendarView />);
      await screen.findByTestId('calendar-view');

      const today = screen
        .getAllByTestId('calendar-day')
        .find((cell) => cell.getAttribute('aria-current') === 'date') as HTMLElement;
      // The focus color is kept for keyboard focus, so a marked day never looks focused.
      const classes = [today, ...today.querySelectorAll('*')].map(
        (el) => el.getAttribute('class') ?? '',
      );
      expect(classes.join(' ')).not.toMatch(/\b(?:border|ring|text)-focus\b/);
      expect(today).toHaveClass('border-accent-brand');
    });

    it('marks pending orders past their due date as overdue, and nothing else', async () => {
      render(<CalendarView />);

      expect(
        await screen.findByRole('link', {
          name: 'Ver detalles de Atrasada, 18 de noviembre de 2026, En progreso, Vencida',
        }),
      ).toHaveAttribute('data-overdue', 'true');
      expect(
        screen.getByRole('link', {
          name: 'Ver detalles de Terminada, 18 de noviembre de 2026, Completada',
        }),
      ).not.toHaveAttribute('data-overdue');
      expect(
        screen.getByRole('link', {
          name: 'Ver detalles de Próxima, 25 de noviembre de 2026, Abierta',
        }),
      ).not.toHaveAttribute('data-overdue');
    });

    it('explains the status colors and the overdue mark in a legend', async () => {
      render(<CalendarView />);

      const legend = await screen.findByRole('list', { name: 'Referencias' });
      expect(
        within(legend)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(['Abierta', 'En progreso', 'Completada', 'Cancelada', 'Vencida']);
    });

    it('lists only the days with orders on a phone, each with its full date', async () => {
      render(<CalendarView />);
      await screen.findByTestId('calendar-view');

      const days = screen.getAllByTestId('calendar-day');
      const withOrders = days.filter((cell) => cell.querySelector('a'));
      const without = days.filter((cell) => !cell.querySelector('a'));
      // On phones the 7-column grid becomes a list; empty days are hidden below `sm`.
      expect(without.every((cell) => cell.classList.contains('hidden'))).toBe(true);
      expect(withOrders.some((cell) => cell.classList.contains('hidden'))).toBe(false);
      expect(within(withOrders[0]).getByText('miércoles, 18 de noviembre')).toBeInTheDocument();
    });
  });
});
