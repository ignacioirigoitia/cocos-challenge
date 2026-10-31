import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { useSettings } from '@/shared/store/settings';

import { PortfolioResponseSchema } from './schema';

export function usePortfolio() {
  // El portfolio depende de la cuenta y del modo de la API: cambiar cualquiera lo vuelve a pedir.
  const bugMode = useSettings((s) => s.bugMode);
  const candidateId = useSettings((s) => s.candidateId);

  return useQuery({
    queryKey: ['portfolio', bugMode, candidateId],
    queryFn: ({ signal }) => api.get('/portfolio', PortfolioResponseSchema, { signal }),
  });
}
