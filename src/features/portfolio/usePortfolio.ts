import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { type BugMode, useSettings } from '@/shared/store/settings';

import { PortfolioResponseSchema } from './schema';

// El portfolio depende de la cuenta y del modo de la API: cambiar cualquiera lo vuelve a pedir.
export function portfolioQueryOptions(bugMode: BugMode, candidateId: string) {
  return queryOptions({
    queryKey: ['portfolio', bugMode, candidateId],
    queryFn: ({ signal }) => api.get('/portfolio', PortfolioResponseSchema, { signal }),
  });
}

export function usePortfolio() {
  const bugMode = useSettings((s) => s.bugMode);
  const candidateId = useSettings((s) => s.candidateId);
  return useQuery(portfolioQueryOptions(bugMode, candidateId));
}
