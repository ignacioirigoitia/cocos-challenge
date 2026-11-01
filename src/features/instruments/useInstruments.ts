import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { type BugMode, useSettings } from '@/shared/store/settings';

import { InstrumentsResponseSchema } from './schema';

// El modo de bugs forma parte de la key: al cambiarlo, los datos se piden de nuevo.
export function instrumentsQueryOptions(bugMode: BugMode) {
  return queryOptions({
    queryKey: ['instruments', bugMode],
    queryFn: ({ signal }) => api.get('/instruments', InstrumentsResponseSchema, { signal }),
  });
}

export function useInstruments() {
  const bugMode = useSettings((s) => s.bugMode);
  return useQuery(instrumentsQueryOptions(bugMode));
}
