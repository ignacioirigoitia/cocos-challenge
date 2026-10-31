import { createQueryClient } from './queryClient';
import { retryDelay, shouldRetry } from './retry';

describe('createQueryClient', () => {
  const defaults = createQueryClient().getDefaultOptions();

  it('NUNCA reintenta las mutaciones: repetir una orden podría duplicarla', () => {
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('las lecturas usan la política de reintentos acordada', () => {
    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.queries?.retryDelay).toBe(retryDelay);
  });

  it('el caché de lecturas dura un minuto para no repetir pedidos a la API', () => {
    expect(defaults.queries?.staleTime).toBe(60_000);
  });
});
