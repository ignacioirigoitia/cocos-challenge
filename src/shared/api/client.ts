import { z } from 'zod';

import { ApiError } from './errors';

export interface ApiClientConfig {
  baseUrl: string;
  /** Se evalúa en cada request, así los cambios de ajustes (modo de bugs) se aplican al instante. */
  getHeaders: () => Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  signal?: AbortSignal;
}

// ponytail: Retry-After solo en segundos; la variante con fecha HTTP se ignora (queda indefinido).
function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export function createApiClient({
  baseUrl,
  getHeaders,
  timeoutMs = 10_000,
  // Se resuelve en cada pedido (no al crear el cliente) para poder reemplazar fetch, ej. en tests.
  fetchImpl = (...args) => fetch(...args),
}: ApiClientConfig) {
  async function request<T>(
    method: 'GET' | 'POST',
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    { signal }: RequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', onCallerAbort);

    try {
      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}${path}`, {
          method,
          headers: {
            Accept: 'application/json',
            ...(body !== undefined && { 'Content-Type': 'application/json' }),
            ...getHeaders(),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } catch (e) {
        if (signal?.aborted) throw e; // cancelado por quien llama (ej. React Query): no es un error de red
        if (timedOut) throw new ApiError('timeout', 'La API tardó demasiado en responder');
        throw new ApiError('network', 'No hay conexión con la API');
      }

      if (res.status === 429) {
        throw new ApiError('rate_limit', 'Demasiados pedidos a la API', {
          status: 429,
          retryAfterMs: parseRetryAfter(res.headers.get('retry-after')),
        });
      }
      // La plataforma que aloja la API (Vercel) responde un 403 con una página HTML de "Security
      // Checkpoint" cuando detecta demasiados pedidos seguidos. No es un 429 ni lleva JSON, y el
      // pedido nunca llegó a la API.
      const contentType = res.headers.get('content-type') ?? '';
      if (res.status === 403 && contentType.includes('text/html')) {
        throw new ApiError('blocked', 'La plataforma bloqueó temporalmente los pedidos', {
          status: 403,
        });
      }
      if (!res.ok) {
        const data = (await readJson(res)) as { error?: unknown } | undefined;
        const message = typeof data?.error === 'string' ? data.error : `Error HTTP ${res.status}`;
        throw new ApiError('http', message, { status: res.status });
      }

      const json = await readJson(res);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError('validation', 'La API devolvió datos con un formato inesperado');
      }
      return parsed.data;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  return {
    get: <T>(path: string, schema: z.ZodType<T>, options?: RequestOptions) =>
      request('GET', path, schema, undefined, options),
    post: <T>(path: string, body: unknown, schema: z.ZodType<T>, options?: RequestOptions) =>
      request('POST', path, schema, body, options),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
