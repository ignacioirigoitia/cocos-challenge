import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

import real from './__fixtures__/portfolio.real.json';
import { usePortfolio } from './usePortfolio';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

// Un solo QueryClient por test: si se creara en cada render, el hook pediría los datos en bucle.
let client: ReturnType<typeof createQueryClient>;
let fetchMock: jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn(async () => fakeResponse(real));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => client.clear());

function headersOfCall(index: number) {
  return (fetchMock.mock.calls[index] as [string, RequestInit])[1].headers;
}

describe('usePortfolio', () => {
  it('devuelve el portfolio validado, pidiéndolo con el candidate id de los ajustes', async () => {
    const { result } = await renderHook(() => usePortfolio(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.cash.toString()).toBe('999972.88');
    expect(result.current.data?.holdings[0].ticker).toBe('GARO');
    expect(fetchMock.mock.calls[0][0]).toBe('https://dummy-api-topaz.vercel.app/portfolio');
    expect(headersOfCall(0)).toMatchObject({
      'X-Enable-Bugs': 'off',
      'X-Candidate-Id': 'ignacio-irigoitia',
    });
  });

  it('al cambiar el modo de bugs vuelve a pedir el portfolio', async () => {
    const { result } = await renderHook(() => usePortfolio(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => useSettings.getState().setBugMode('medium'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(headersOfCall(1)).toMatchObject({ 'X-Enable-Bugs': 'medium' });
  });
});
