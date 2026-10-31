import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { useSettings } from '@/shared/store/settings';

import { InstrumentsResponseSchema } from './schema';

export function useInstruments() {
  // El modo de bugs forma parte de la key: al cambiarlo, los datos se piden de nuevo.
  const bugMode = useSettings((s) => s.bugMode);

  return useQuery({
    queryKey: ['instruments', bugMode],
    queryFn: ({ signal }) => api.get('/instruments', InstrumentsResponseSchema, { signal }),
  });
}
