import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../../../tailwind.config.mjs';

const { getCalendarConnectionStatus, startCalendarConnection } = vi.hoisted(() => ({
  getCalendarConnectionStatus: vi.fn(),
  startCalendarConnection: vi.fn(),
}));

vi.mock('../../lib/calendar', () => ({
  getCalendarConnectionStatus,
  startCalendarConnection,
}));

import { CalendarConnection } from './CalendarConnection';

/** CSS Tailwind generates for one class; empty when the theme has no such color. */
async function cssFor(className: string): Promise<string> {
  const result = await postcss([
    tailwindcss({ ...config, content: [{ raw: `<span class="${className}"></span>` }] }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css;
}

async function statusDotColor(): Promise<string> {
  const dot = (await screen.findByTestId('calendar-connection-dot')) as HTMLElement;
  const background = [...dot.classList].find((name) => name.startsWith('bg-'));
  expect(background).toBeDefined();
  return cssFor(background!);
}

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

  it('colors the status dot green when connected and grey when not', async () => {
    getCalendarConnectionStatus.mockResolvedValue({ connected: true, status: 'active' });
    const { unmount } = render(<CalendarConnection />);
    await screen.findByText('Conectado');
    expect(await statusDotColor()).toContain('var(--color-status-completed)');
    unmount();

    getCalendarConnectionStatus.mockResolvedValue({ connected: false, status: 'disconnected' });
    render(<CalendarConnection />);
    await screen.findByText('Desconectado');
    expect(await statusDotColor()).toContain('var(--color-fg-tertiary)');
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
