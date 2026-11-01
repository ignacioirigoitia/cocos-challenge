import { ApiError } from '@/shared/api/errors';

/**
 * ¿Pudo el servidor haber recibido la orden aunque el envío haya fallado? Si sí, se le avisa al
 * usuario que revise el portfolio antes de reintentar, porque la app nunca reenvía sola.
 * Un 4xx (incluido el 429) significa que el servidor no la procesó.
 */
export function isOutcomeUncertain(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.kind === 'rate_limit') return false;
  if (error.kind === 'http') return (error.status ?? 0) >= 500;
  return true; // network, timeout o respuesta ilegible
}
