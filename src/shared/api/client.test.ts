import { z } from 'zod';

import { ApiError } from './errors';
import { createApiClient } from './client';

type Fetch = typeof fetch;

function fakeResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

function clientWith(fetchImpl: Fetch, timeoutMs = 1000) {
  return createApiClient({
    baseUrl: 'https://api.test',
    getHeaders: () => ({ 'X-Enable-Bugs': 'off', 'X-Candidate-Id': 'ignacio-irigoitia' }),
    timeoutMs,
    fetchImpl,
  });
}

const Item = z.object({ id: z.number() });

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('se esperaba un error y no hubo');
}

describe('createApiClient', () => {
  it('hace GET con los headers configurados y devuelve el dato validado', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse([{ id: 1 }]));
    const data = await clientWith(fetchImpl as unknown as Fetch).get('/instruments', z.array(Item));

    expect(data).toEqual([{ id: 1 }]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/instruments');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({
      'X-Enable-Bugs': 'off',
      'X-Candidate-Id': 'ignacio-irigoitia',
    });
  });

  it('hace POST con el body en JSON', async () => {
    const fetchImpl = jest.fn(async () => fakeResponse({ id: 7 }));
    await clientWith(fetchImpl as unknown as Fetch).post('/orders', { side: 'BUY' }, Item);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"side":"BUY"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('error HTTP: kind http, con status y el mensaje de la API', async () => {
    const fetchImpl = async () => fakeResponse({ error: 'Missing header' }, 400);
    const err = await errorOf(clientWith(fetchImpl).get('/portfolio', Item));

    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('http');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Missing header');
  });

  it('429: kind rate_limit y respeta Retry-After (segundos a ms)', async () => {
    const fetchImpl = async () => fakeResponse({}, 429, { 'retry-after': '2' });
    const err = await errorOf(clientWith(fetchImpl).get('/instruments', Item));

    expect(err.kind).toBe('rate_limit');
    expect(err.retryAfterMs).toBe(2000);
  });

  it('429 sin Retry-After: retryAfterMs queda indefinido', async () => {
    const fetchImpl = async () => fakeResponse({}, 429);
    const err = await errorOf(clientWith(fetchImpl).get('/instruments', Item));

    expect(err.kind).toBe('rate_limit');
    expect(err.retryAfterMs).toBeUndefined();
  });

  it('403 con una página HTML (bloqueo de seguridad de la plataforma): kind blocked', async () => {
    // Es lo que respondió la API real ("Vercel Security Checkpoint") tras una ráfaga de pedidos.
    const fetchImpl = async () =>
      fakeResponse('<!DOCTYPE html>...', 403, { 'content-type': 'text/html; charset=utf-8' });
    const err = await errorOf(clientWith(fetchImpl).get('/instruments', Item));

    expect(err.kind).toBe('blocked');
    expect(err.status).toBe(403);
  });

  it('un 403 con JSON es un error HTTP común, no un bloqueo', async () => {
    const fetchImpl = async () =>
      fakeResponse({ error: 'Prohibido' }, 403, { 'content-type': 'application/json' });
    const err = await errorOf(clientWith(fetchImpl).get('/portfolio', Item));

    expect(err.kind).toBe('http');
    expect(err.message).toBe('Prohibido');
  });

  it('5xx: kind http con el status', async () => {
    const fetchImpl = async () => fakeResponse({}, 503);
    const err = await errorOf(clientWith(fetchImpl).get('/instruments', Item));

    expect(err.kind).toBe('http');
    expect(err.status).toBe(503);
  });

  it('sin conexión: kind network', async () => {
    const fetchImpl = async () => {
      throw new TypeError('Network request failed');
    };
    const err = await errorOf(clientWith(fetchImpl).get('/instruments', Item));

    expect(err.kind).toBe('network');
  });

  it('timeout: kind timeout si el servidor no responde a tiempo', async () => {
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        );
      })) as unknown as Fetch;
    const err = await errorOf(clientWith(fetchImpl, 20).get('/instruments', Item));

    expect(err.kind).toBe('timeout');
  });

  it('datos que no cumplen el esquema: kind validation', async () => {
    const fetchImpl = async () => fakeResponse({ id: 'no-es-un-numero' });
    const err = await errorOf(clientWith(fetchImpl).get('/instruments', Item));

    expect(err.kind).toBe('validation');
  });

  it('si cancela quien llama, propaga el AbortError y no lo trata como timeout', async () => {
    const fetchImpl = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        );
      })) as unknown as Fetch;
    const controller = new AbortController();
    const promise = clientWith(fetchImpl, 1000).get('/instruments', Item, {
      signal: controller.signal,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
