import { QueryClient } from '@tanstack/react-query';

import { retryDelay, shouldRetry } from './retry';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        // La API se trata como externa con posible rate limit: no se repite un pedido hasta que vence.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
      // Una orden nunca se reintenta sola: si el servidor la recibió, se duplicaría.
      mutations: { retry: false },
    },
  });
}
