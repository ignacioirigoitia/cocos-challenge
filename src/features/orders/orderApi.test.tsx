import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Big } from 'big.js';
import type { ReactNode } from 'react';

import { ApiError } from '@/shared/api/errors';
import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

import real from './__fixtures__/order.real.json';
import { refreshOrderData } from './refreshOrderData';
import { useSubmitOrder } from './useSubmitOrder';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const instrument = (price: number) => ({
  id: 16,
  ticker: 'GARO',
  name: 'Garovaglio',
  type: 'ACCIONES',
  last_price: price,
  close_price: 24.44,
});
const portfolio = {
  cash: 999972.88,
  holdings: [
    {
      instrument_id: 16,
      ticker: 'GARO',
      quantity: 3,
      last_price: 27.4,
      close_price: 24.44,
      avg_cost_price: 27.12,
    },
  ],
};

// Un solo QueryClient por test: si se creara en cada render, los hooks pedirían en bucle.
let client: ReturnType<typeof createQueryClient>;
let fetchMock: jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => client.clear());

const request = {
  instrumentId: 16,
  side: 'BUY' as const,
  type: 'MARKET' as const,
  quantity: new Big('1'),
};

describe('useSubmitOrder', () => {
  it('envía el POST con el body de la orden y devuelve la respuesta validada', async () => {
    fetchMock.mockResolvedValue(fakeResponse(real));
    const { result } = await renderHook(() => useSubmitOrder(), { wrapper });

    let order;
    await act(async () => {
      order = await result.current.mutateAsync(request);
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://dummy-api-topaz.vercel.app/orders');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      instrument_id: 16,
      side: 'BUY',
      type: 'MARKET',
      quantity: 1,
    });
    expect(order).toMatchObject({ id: 147106, status: 'FILLED' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('NUNCA reintenta: si falla por red, el POST se hace una sola vez', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = await renderHook(() => useSubmitOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(request).catch(() => undefined);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).kind).toBe('network');
  });

  it('al enviar la orden marca el portfolio como desactualizado para refrescarlo', async () => {
    fetchMock.mockResolvedValue(fakeResponse(real));
    client.setQueryData(['portfolio', 'off', 'ignacio-irigoitia'], { cash: 1 });
    const { result } = await renderHook(() => useSubmitOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(request);
    });

    expect(client.getQueryState(['portfolio', 'off', 'ignacio-irigoitia'])?.isInvalidated).toBe(
      true,
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('refreshOrderData', () => {
  const respond = (price: number) =>
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(url.endsWith('/portfolio') ? portfolio : [instrument(price)]),
    );

  it('trae el precio actual, el efectivo y las tenencias del instrumento', async () => {
    respond(27.4);

    const data = await refreshOrderData(client, 16);

    expect(data.instrument?.ticker).toBe('GARO');
    expect(data.instrument?.lastPrice?.toString()).toBe('27.4');
    expect(data.cash.toString()).toBe('999972.88');
    expect(data.held.toString()).toBe('3');
  });

  it('ignora el caché: vuelve a pedir aunque haya datos recientes', async () => {
    respond(27.4);
    await refreshOrderData(client, 16);
    respond(30);

    const data = await refreshOrderData(client, 16);

    expect(data.instrument?.lastPrice?.toString()).toBe('30');
    expect(fetchMock).toHaveBeenCalledTimes(4); // 2 pedidos por cada refresco
  });

  it('si no tenés el instrumento, las tenencias son 0', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(url.endsWith('/portfolio') ? { cash: 100, holdings: [] } : [instrument(27.4)]),
    );

    expect((await refreshOrderData(client, 16)).held.toString()).toBe('0');
  });

  it('si el instrumento ya no está en la lista, lo informa', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(url.endsWith('/portfolio') ? portfolio : []),
    );

    expect((await refreshOrderData(client, 16)).instrument).toBeUndefined();
  });

  it('si falla alguno de los dos pedidos, falla con el error de la API (no se avanza)', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/portfolio')
        ? fakeResponse({ error: 'caído' }, 400)
        : fakeResponse([instrument(27.4)]),
    );

    await expect(refreshOrderData(client, 16)).rejects.toMatchObject({ kind: 'http', status: 400 });
  });
});
