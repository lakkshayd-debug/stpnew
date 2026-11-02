import type { ApiError } from '@shared/types';

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';
export const apiBase = BASE;

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh() {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok).catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}

export async function api<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: BodyInit; form?: FormData; json?: unknown } = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  let body: BodyInit | undefined = init.body;
  if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.json); }
  if (init.form) body = init.form; // browser sets the multipart boundary

  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers, body, credentials: 'include' });
  } catch {
    throw new HttpError(0, 'NETWORK', `Cannot reach the server at ${BASE}. Check your internet, or the VITE_API_URL setting.`);
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return api<T>(path, init, false);
  }
  if (!res.ok) {
    const e = (await res.json().catch(() => null)) as ApiError | null;
    throw new HttpError(res.status, e?.error.code ?? 'ERROR', e?.error.message ?? res.statusText, e?.error.details);
  }
  const ct = res.headers.get('content-type') ?? '';
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>;
}
