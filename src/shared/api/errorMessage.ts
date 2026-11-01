import { ApiError } from './errors';

/** Mensaje en español, pensado para el usuario, para cada tipo de error de la API. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Intentá de nuevo.';

  switch (error.kind) {
    case 'network':
      return 'No hay conexión. Revisá tu internet e intentá de nuevo.';
    case 'timeout':
      return 'El servidor tardó demasiado en responder. Intentá de nuevo.';
    case 'rate_limit': {
      const wait =
        error.retryAfterMs !== undefined
          ? `Esperá ${Math.ceil(error.retryAfterMs / 1000)} segundos`
          : 'Esperá unos segundos';
      return `Hiciste demasiados pedidos. ${wait} e intentá de nuevo.`;
    }
    case 'blocked':
      return 'El servicio bloqueó temporalmente los pedidos desde este dispositivo. Esperá unos minutos e intentá de nuevo.';
    case 'http':
      return (error.status ?? 0) >= 500
        ? 'El servicio tuvo un problema. Intentá de nuevo en un rato.'
        : error.message;
    case 'validation':
      return 'Recibimos datos con un formato inesperado.';
  }
}
