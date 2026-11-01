import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api';

import { type OrderRequest, OrderResponseSchema, toOrderBody } from './order';

export function useSubmitOrder() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (request: OrderRequest) =>
      api.post('/orders', toOrderBody(request), OrderResponseSchema),
    // Una orden nunca se reintenta sola: si el servidor la recibió, se duplicaría.
    retry: false,
    // El efectivo y las tenencias cambiaron: el portfolio hay que volver a pedirlo.
    onSuccess: () => client.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}
