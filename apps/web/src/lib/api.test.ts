import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCall, apiDownload, apiPut } from './api';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('apiCall', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns NETWORK_ERROR when fetch rejects', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connection refused'));

    const result = await apiCall('/test', {}, 'token');

    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.data).toBeUndefined();
  });

  it('returns the structured API error when the response carries an error envelope', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Client not found' } }, { status: 404 }),
    );

    const result = await apiCall('/clients/1', {}, 'token');

    expect(result.error).toEqual({ code: 'NOT_FOUND', message: 'Client not found' });
  });

  it('falls back to HTTP_ERROR when the error body has no structured error object', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ unexpected: true }, { status: 500 }));

    const result = await apiCall('/test', {}, 'token');

    expect(result.error?.code).toBe('HTTP_ERROR');
    expect(result.error?.message).toBe('HTTP 500');
  });

  it('falls back to HTTP_ERROR when the error field is not a structured API error', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'boom' }, { status: 400 }));

    const result = await apiCall('/test', {}, 'token');

    expect(result.error?.code).toBe('HTTP_ERROR');
    expect(result.error?.message).toBe('HTTP 400');
  });

  it('returns raw JSON payloads directly', async () => {
    const payload = { items: [{ id: 'c1' }], nextCursor: 'abc' };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(payload));

    const result = await apiCall<typeof payload>('/clients', {}, 'token');

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(payload);
  });

  it('unwraps data-enveloped responses', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { id: 'c1', name: 'Acme' } }));

    const result = await apiCall<{ id: string; name: string }>('/clients/c1', {}, 'token');

    expect(result.data).toEqual({ id: 'c1', name: 'Acme' });
  });

  it('treats 204 as a successful empty payload', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    const result = await apiCall<void>('/clients/c1', { method: 'DELETE' }, 'token');

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('treats a 200 with an empty body as a successful empty payload', async () => {
    // Nest answers 200 with no body when a DELETE handler returns nothing.
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));

    const result = await apiCall<void>('/work-orders/wo-1', { method: 'DELETE' }, 'token');

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('falls back to HTTP_ERROR when an error response has an empty body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 502 }));

    const result = await apiCall('/work-orders/wo-1', { method: 'DELETE' }, 'token');

    expect(result.error).toEqual({ code: 'HTTP_ERROR', message: 'HTTP 502' });
  });

  it('sends the bearer token and JSON headers', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));

    await apiCall('/clients', { method: 'POST', body: '{}' }, 'secret-token');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/clients');
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('apiPut', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a PUT request with a JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));

    await apiPut('/organization/profile', { phone: '555' }, 'token');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe(JSON.stringify({ phone: '555' }));
  });
});

describe('apiDownload', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the bearer token and returns the file with its name', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('xlsx-bytes', {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="ijac-export-2026-11-12.xlsx"',
        },
      }),
    );

    const result = await apiDownload('/export.xlsx', 'secret-token');

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/api/export.xlsx');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret-token');
    expect(result.error).toBeUndefined();
    expect(result.data?.filename).toBe('ijac-export-2026-11-12.xlsx');
    expect(await result.data?.blob.text()).toBe('xlsx-bytes');
  });

  it('falls back to the given name when the response does not name the file', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await apiDownload('/export.json', 'token', 'export.json');

    expect(result.data?.filename).toBe('export.json');
  });

  it('returns the structured API error of a failed download', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } }, { status: 403 }),
    );

    const result = await apiDownload('/export.xlsx', 'token');

    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ code: 'FORBIDDEN', message: 'Insufficient role' });
  });

  it('returns HTTP_ERROR for a failed download without an error body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 500 }));

    const result = await apiDownload('/export.xlsx', 'token');

    expect(result.error).toEqual({ code: 'HTTP_ERROR', message: 'HTTP 500' });
  });

  it('returns NETWORK_ERROR when fetch rejects', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));

    const result = await apiDownload('/export.xlsx', 'token');

    expect(result.error?.code).toBe('NETWORK_ERROR');
  });
});
