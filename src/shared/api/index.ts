import { useSettings } from '@/shared/store/settings';

import { createApiClient } from './client';

const DEFAULT_BASE_URL = 'https://dummy-api-topaz.vercel.app';

/** Cliente único de la app. Los headers salen de los ajustes en cada pedido. */
export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL,
  getHeaders: () => {
    const { bugMode, candidateId } = useSettings.getState();
    return { 'X-Enable-Bugs': bugMode, 'X-Candidate-Id': candidateId };
  },
});
