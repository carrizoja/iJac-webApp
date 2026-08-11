import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { getCalendarConnectionStatus, startCalendarConnection } = vi.hoisted(() => ({
  getCalendarConnectionStatus: vi.fn(),
  startCalendarConnection: vi.fn(),
}));

vi.mock('../../lib/calendar', () => ({
  getCalendarConnectionStatus,
  startCalendarConnection,
}));

import { CalendarConnection } from './CalendarConnection';

describe('CalendarConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCalendarConnectionStatus.mockResolvedValue({ connected: false, status: 'disconnected' });
    window.history.replaceState({}, '', '/calendar');
  });

  it('announces a successful callback, loads status, and consumes the query parameter', async () => {
    getCalendarConnectionStatus.mockResolvedValue({ connected: true, status: 'active' });
    window.history.replaceState({}, '', '/calendar?connection=success&tab=month');

    render(<CalendarConnection />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Google Calendar se conectó correctamente.',
    );
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(getCalendarConnectionStatus).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.location.search).toBe('?tab=month'));
  });

  it('announces a failed callback with retry guidance and consumes the query parameter', async () => {
    window.history.replaceState({}, '', '/calendar?connection=error');

    render(<CalendarConnection />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar Google Calendar. Intentá conectarlo nuevamente.',
    );
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe(''));
  });
});
