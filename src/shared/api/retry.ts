import { ApiError } from './errors';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

/** Solo se reintenta lo que puede arreglarse solo: red, timeout, rate limit y 5xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiError)) return false;
  switch (error.kind) {
    case 'network':
    case 'timeout':
    case 'rate_limit':
      return true;
    case 'http':
      return (error.status ?? 0) >= 500;
    default:
      return false;
  }
}

/** Espera exponencial con tope; en un 429 manda el Retry-After de la API si vino. */
export function retryDelay(failureCount: number, error: unknown): number {
  if (
    error instanceof ApiError &&
    error.kind === 'rate_limit' &&
    error.retryAfterMs !== undefined
  ) {
    return error.retryAfterMs;
  }
  return Math.min(BASE_DELAY_MS * 2 ** failureCount, MAX_DELAY_MS);
}
