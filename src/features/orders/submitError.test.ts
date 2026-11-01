import { ApiError } from '@/shared/api/errors';

import { isOutcomeUncertain } from './submitError';

describe('isOutcomeUncertain', () => {
  it.each([
    ['sin conexión', new ApiError('network', 'x')],
    ['timeout', new ApiError('timeout', 'x')],
    ['respuesta con formato inesperado', new ApiError('validation', 'x')],
    ['error del servidor (500)', new ApiError('http', 'x', { status: 500 })],
  ])('%s: el servidor pudo haber recibido la orden', (_name, error) => {
    expect(isOutcomeUncertain(error)).toBe(true);
  });

  it.each([
    ['pedido rechazado (400)', new ApiError('http', 'x', { status: 400 })],
    ['rate limit (429)', new ApiError('rate_limit', 'x', { status: 429 })],
  ])('%s: el servidor no la procesó', (_name, error) => {
    expect(isOutcomeUncertain(error)).toBe(false);
  });

  it('un error desconocido se considera dudoso, por precaución', () => {
    expect(isOutcomeUncertain(new Error('boom'))).toBe(true);
  });
});
