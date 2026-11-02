import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

import { useSearchInstruments } from './useSearchInstruments';

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
let fetchMock: jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn(async () => fakeResponse([dyca]));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => client.clear());

const urlOfCall = (index: number) => fetchMock.mock.calls[index][0] as string;

describe('useSearchInstruments', () => {
  it('busca en el servidor por el texto y devuelve los instrumentos validados', async () => {
    const { result } = await renderHook(() => useSearchInstruments('DY'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(urlOfCall(0)).toBe('https://dummy-api-topaz.vercel.app/search?query=DY');
    expect(result.current.data?.[0].ticker).toBe('DYCA');
    expect(result.current.data?.[0].lastPrice?.toString()).toBe('45.72');
  });

  it('no devuelve la moneda ARS aunque la API la encuentre (con off, "ars" la devuelve)', async () => {
    const ars = {
      id: 26,
      ticker: 'ARS',
      name: 'Pesos',
      type: 'MONEDA',
      last_price: 1,
      close_price: 1,
    };
    fetchMock.mockResolvedValue(fakeResponse([ars]));

    const { result } = await renderHook(() => useSearchInstruments('ars'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('ignora los espacios de los costados', async () => {
    await renderHook(() => useSearchInstruments('  DY '), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(urlOfCall(0)).toBe('https://dummy-api-topaz.vercel.app/search?query=DY');
  });

  it('codifica el texto para que no rompa la URL', async () => {
    await renderHook(() => useSearchInstruments('a&b=1'), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(urlOfCall(0)).toBe('https://dummy-api-topaz.vercel.app/search?query=a%26b%3D1');
  });

  it.each(['', '   '])('con el texto vacío (%p) no consulta a la API', async (text) => {
    const { result } = await renderHook(() => useSearchInstruments(text), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda los headers de los ajustes', async () => {
    useSettings.getState().setBugMode('hard');
    await renderHook(() => useSearchInstruments('DY'), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'X-Enable-Bugs': 'hard',
    });
  });
});
