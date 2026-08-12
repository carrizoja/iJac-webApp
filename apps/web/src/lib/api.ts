import { PUBLIC_API_URL } from 'astro:env/client';

interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Narrow an unknown value to a valid ApiError.
 * Returns the error if it matches the contract, null otherwise.
 */
function isApiError(value: unknown): value is ApiError {
  return (
    isObject(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    value.code.length > 0 &&
    value.message.length > 0
  );
}

function buildApiUrl(path: string): URL {
  const normalizedBaseUrl = PUBLIC_API_URL.endsWith('/') ? PUBLIC_API_URL : `${PUBLIC_API_URL}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  return new URL(normalizedPath, normalizedBaseUrl);
}

export async function apiCall<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<ApiResult<T>> {
  let url: URL;
  try {
    url = buildApiUrl(path);
  } catch (error) {
    console.error('[API] Error constructing URL:', error);
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'Invalid API base URL',
      },
    };
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return { data: undefined as T };
    }

    const body = (await response.json()) as unknown;
    if (!response.ok) {
      if (isObject(body) && isApiError(body.error)) {
        return { error: body.error };
      }
      return {
        error: {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}`,
        },
      };
    }

    if (isObject(body) && 'data' in body) {
      return { data: body.data as T };
    }

    // Nest handlers in this app return raw JSON payloads (not always envelope-shaped).
    return { data: body as T };
  } catch (error) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

export async function apiGet<T>(path: string, token: string | null): Promise<ApiResult<T>> {
  return apiCall<T>(path, { method: 'GET' }, token);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token: string | null,
): Promise<ApiResult<T>> {
  return apiCall<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token: string | null,
): Promise<ApiResult<T>> {
  return apiCall<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token);
}

export async function apiDelete<T>(path: string, token: string | null): Promise<ApiResult<T>> {
  return apiCall<T>(path, { method: 'DELETE' }, token);
}
