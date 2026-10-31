import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/shared/api/errors';
import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

import { useInstruments } from './useInstruments';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const dyca = {
  id: 1,
  ticker: 'DYCA',
  name: 'Dycasa S.A.',
  type: 'ACCIONES',
  last_price: 45.72,
  close_price: 50.07,
};

// Un solo QueryClient por test: si se creara en cada render, el hook pediría los datos en bucle.
let client: ReturnType<typeof createQueryClient>;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

let fetchMock: jest.Mock;

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn(async () => fakeResponse([dyca]));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => client.clear());

function headersOfCall(index: number) {
  return (fetchMock.mock.calls[index] as [string, RequestInit])[1].headers;
}

describe('useInstruments', () => {
  it('devuelve los instrumentos validados, pidiendo con los headers de los ajustes', async () => {
    const { result } = await renderHook(() => useInstruments(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].ticker).toBe('DYCA');
    expect(result.current.data?.[0].lastPrice?.toString()).toBe('45.72');
    expect(fetchMock.mock.calls[0][0]).toBe('https://dummy-api-topaz.vercel.app/instruments');
    expect(headersOfCall(0)).toMatchObject({
      'X-Enable-Bugs': 'off',
      'X-Candidate-Id': 'ignacio-irigoitia',
    });
  });

  it('al cambiar el modo de bugs vuelve a pedir los datos con el nuevo header', async () => {
    const { result } = await renderHook(() => useInstruments(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => useSettings.getState().setBugMode('hard'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(headersOfCall(1)).toMatchObject({ 'X-Enable-Bugs': 'hard' });
  });

  it('expone un ApiError tipado cuando la API responde con error', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ error: 'Missing header' }, 400));
    const { result } = await renderHook(() => useInstruments(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).kind).toBe('http');
  });
});
