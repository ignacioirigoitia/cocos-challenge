import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { type BugMode, useSettings } from '@/shared/store/settings';

import { OrdersResponseSchema } from './schema';

// El historial depende de la cuenta y del modo de la API: cambiar cualquiera lo vuelve a pedir.
export function ordersQueryOptions(bugMode: BugMode, candidateId: string) {
  return queryOptions({
    queryKey: ['orders', bugMode, candidateId],
    queryFn: ({ signal }) => api.get('/orders', OrdersResponseSchema, { signal }),
  });
}

export function useOrders() {
  const bugMode = useSettings((s) => s.bugMode);
  const candidateId = useSettings((s) => s.candidateId);
  return useQuery(ordersQueryOptions(bugMode, candidateId));
}
