import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('links events to the static details route with an encoded ID', async () => {
    render(<CalendarView />);

    const link = await screen.findByRole('link', { name: 'Ver detalles de Revisión remota' });

    expect(link).toHaveAttribute('href', '/work-orders/details?id=work%2Forder%20%3F%201');
    expect(link).toHaveAttribute('title', 'Ver detalles de Revisión remota');
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
      'text-priority-high',
      /1 exitosa, 1 fallida de 2 intentadas/i,
    ],
    [
      { attempted: 1, succeeded: 0, failed: 1 },
      'alert',
      'text-destructive',
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
});
