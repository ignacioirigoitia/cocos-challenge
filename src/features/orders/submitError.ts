import { ApiError } from '@/shared/api/errors';

/**
 * ¿Pudo el servidor haber recibido la orden aunque el envío haya fallado? Si sí, se le avisa al
 * usuario que revise el portfolio antes de reintentar, porque la app nunca reenvía sola.
 * Un 4xx (incluido el 429) o un bloqueo de la plataforma significa que no se procesó.
 */
export function isOutcomeUncertain(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  // 429 y bloqueo de la plataforma: el pedido no llegó a procesarse.
  if (error.kind === 'rate_limit' || error.kind === 'blocked') return false;
  if (error.kind === 'http') return (error.status ?? 0) >= 500;
  return true; // network, timeout o respuesta ilegible
}
