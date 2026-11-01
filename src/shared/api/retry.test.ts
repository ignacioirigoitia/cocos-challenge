import { ApiError } from './errors';
import { retryDelay, shouldRetry } from './retry';

describe('shouldRetry (lecturas)', () => {
  it.each([
    ['network', new ApiError('network', 'x')],
    ['timeout', new ApiError('timeout', 'x')],
    ['rate_limit', new ApiError('rate_limit', 'x', { status: 429 })],
    ['500', new ApiError('http', 'x', { status: 500 })],
    ['503', new ApiError('http', 'x', { status: 503 })],
  ])('reintenta en %s', (_name, error) => {
    expect(shouldRetry(0, error)).toBe(true);
  });

  it.each([
    [
      'bloqueo temporal (reintentar solo lo alargaría)',
      new ApiError('blocked', 'x', { status: 403 }),
    ],
    ['400', new ApiError('http', 'x', { status: 400 })],
    ['404', new ApiError('http', 'x', { status: 404 })],
    ['datos inválidos', new ApiError('validation', 'x')],
    ['un error desconocido', new Error('boom')],
  ])('no reintenta en %s: repetirlo no lo arregla', (_name, error) => {
    expect(shouldRetry(0, error)).toBe(false);
  });

  it('reintenta como máximo 2 veces', () => {
    const error = new ApiError('network', 'x');

    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });
});

describe('retryDelay', () => {
  const network = new ApiError('network', 'x');

  it('espera cada vez más (exponencial)', () => {
    expect(retryDelay(0, network)).toBe(1000);
    expect(retryDelay(1, network)).toBe(2000);
    expect(retryDelay(2, network)).toBe(4000);
  });

  it('tiene un tope de 8 segundos', () => {
    expect(retryDelay(10, network)).toBe(8000);
  });

  it('en un 429 respeta el tiempo que pidió la API (Retry-After)', () => {
    const limited = new ApiError('rate_limit', 'x', { status: 429, retryAfterMs: 5000 });

    expect(retryDelay(0, limited)).toBe(5000);
  });

  it('en un 429 sin Retry-After usa la espera exponencial', () => {
    const limited = new ApiError('rate_limit', 'x', { status: 429 });

    expect(retryDelay(1, limited)).toBe(2000);
  });
});
