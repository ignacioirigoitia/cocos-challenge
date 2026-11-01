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
    // El efectivo y las tenencias cambiaron y hay una orden nueva: portfolio e historial se vuelven
    // a pedir.
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['portfolio'] }),
        client.invalidateQueries({ queryKey: ['orders'] }),
      ]),
  });
}
