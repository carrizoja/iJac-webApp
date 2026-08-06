import type { CalendarEvent } from '@ijac/shared';
import { apiGet, apiPost } from './api';
import { getCurrentToken } from './auth';

export async function listCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const token = await getCurrentToken();
  if (!token) throw new Error('UNAUTHORIZED');
  const params = new URLSearchParams({ from, to });
  const result = await apiGet<CalendarEvent[]>(`/calendar/events?${params.toString()}`, token);
  if (result.error) throw new Error(result.error.code);
  return result.data ?? [];
}

export async function getCalendarConnectionStatus(): Promise<{ connected: boolean; status: string }> {
  const token = await getCurrentToken();
  if (!token) throw new Error('UNAUTHORIZED');
  const result = await apiGet<{ connected: boolean; status: string }>('/calendar/connection/status', token);
  if (result.error) throw new Error(result.error.code);
  return result.data as { connected: boolean; status: string };
}

export async function startCalendarConnection(): Promise<{ authorizationUrl: string; nonce: string }> {
  const token = await getCurrentToken();
  if (!token) throw new Error('UNAUTHORIZED');
  const result = await apiPost<{ authorizationUrl: string; nonce: string }>('/calendar/connection/start', {}, token);
  if (result.error) throw new Error(result.error.code);
  return result.data as { authorizationUrl: string; nonce: string };
}

export async function getCalendarSyncStatus(): Promise<{ connected: boolean; status: string }> {
  const token = await getCurrentToken();
  if (!token) throw new Error('UNAUTHORIZED');
  const result = await apiGet<{ connected: boolean; status: string }>('/calendar/sync/status', token);
  if (result.error) throw new Error(result.error.code);
  return result.data as { connected: boolean; status: string };
}

export async function syncCalendar(from: string, to: string): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const token = await getCurrentToken();
  if (!token) throw new Error('UNAUTHORIZED');
  const params = new URLSearchParams({ from, to });
  const result = await apiPost<{ attempted: number; succeeded: number; failed: number }>(`/calendar/sync?${params.toString()}`, {}, token);
  if (result.error) throw new Error(result.error.code);
  return result.data as { attempted: number; succeeded: number; failed: number };
}
