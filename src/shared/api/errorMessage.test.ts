import { ApiError } from './errors';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('sin conexión', () => {
    expect(errorMessage(new ApiError('network', 'x'))).toBe(
      'No hay conexión. Revisá tu internet e intentá de nuevo.',
    );
  });

  it('timeout', () => {
    expect(errorMessage(new ApiError('timeout', 'x'))).toBe(
      'El servidor tardó demasiado en responder. Intentá de nuevo.',
    );
  });

  it('rate limit sin tiempo informado', () => {
    expect(errorMessage(new ApiError('rate_limit', 'x', { status: 429 }))).toBe(
      'Hiciste demasiados pedidos. Esperá unos segundos e intentá de nuevo.',
    );
  });

  it('rate limit con el tiempo que pidió la API', () => {
    const error = new ApiError('rate_limit', 'x', { status: 429, retryAfterMs: 5000 });

    expect(errorMessage(error)).toBe(
      'Hiciste demasiados pedidos. Esperá 5 segundos e intentá de nuevo.',
    );
  });

  it('bloqueo temporal de la plataforma', () => {
    expect(errorMessage(new ApiError('blocked', 'x', { status: 403 }))).toBe(
      'El servicio bloqueó temporalmente los pedidos desde este dispositivo. Esperá unos minutos e intentá de nuevo.',
    );
  });

  it('error del servidor (5xx)', () => {
    expect(errorMessage(new ApiError('http', 'x', { status: 503 }))).toBe(
      'El servicio tuvo un problema. Intentá de nuevo en un rato.',
    );
  });

  it('error HTTP del cliente (4xx): muestra el mensaje de la API', () => {
    expect(errorMessage(new ApiError('http', 'Missing header', { status: 400 }))).toBe(
      'Missing header',
    );
  });

  it('datos con formato inesperado', () => {
    expect(errorMessage(new ApiError('validation', 'x'))).toBe(
      'Recibimos datos con un formato inesperado.',
    );
  });

  it('cualquier otro error', () => {
    expect(errorMessage(new Error('boom'))).toBe('Algo salió mal. Intentá de nuevo.');
  });
});
