const API_BASE = '/api';

// Admin auth now relies on an httpOnly cookie set by the server on login
// (sent automatically on same-origin requests). No persistent token storage.
export function getStoredToken(): string | null {
  return null;
}

export function storeToken(_token: string | null) {
  // no-op: token lives in an httpOnly cookie, not accessible to JS
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  authed?: boolean;
}

export async function api<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, authed = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authed) {
    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    if (res.status === 401 && authed) {
      storeToken(null);
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export function formatTimestamp(value: string | Date | null | undefined): string {
  if (!value) return 'Just now';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}