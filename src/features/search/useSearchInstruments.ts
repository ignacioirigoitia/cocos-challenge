import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { useSettings } from '@/shared/store/settings';

import { InstrumentsResponseSchema } from '../instruments/schema';

/** Búsqueda por ticker en el servidor. Con el texto vacío no consulta. */
export function useSearchInstruments(text: string) {
  const bugMode = useSettings((s) => s.bugMode);
  const query = text.trim();

  return useQuery({
    queryKey: ['search', bugMode, query],
    queryFn: ({ signal }) =>
      api.get(`/search?query=${encodeURIComponent(query)}`, InstrumentsResponseSchema, { signal }),
    enabled: query.length > 0,
    // Mientras llega el resultado de la nueva letra se sigue mostrando el anterior (sin parpadeo).
    placeholderData: keepPreviousData,
  });
}
