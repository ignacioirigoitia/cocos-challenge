import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import instrumentsOff from '@/features/instruments/__fixtures__/instruments.off.json';
import { createQueryClient } from '@/shared/api/queryClient';
import { formatDateTime } from '@/shared/format/date';
import { useSettings } from '@/shared/store/settings';
import { palettes } from '@/shared/ui/theme';

import { OrdersScreen } from './OrdersScreen';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const order = (change: object) => ({
  candidate_id: 'ignacio-irigoitia',
  instrument_id: 16,
  side: 'BUY',
  type: 'MARKET',
  quantity: 1,
  price: 27.12,
  status: 'FILLED',
  created_at: '2026-11-01T00:00:00.000Z',
  ...change,
});

// GARO es el instrumento 16 y CAPX el 2. Casos armados a mano, desordenados a propósito.
const orders = [
  order({ id: 1, created_at: '2026-10-31T19:08:07.557Z' }),
  order({
    id: 2,
    instrument_id: 2,
    quantity: 10,
    price: 53.68,
    created_at: '2026-11-01T02:08:13.716Z',
  }),
  order({
    id: 3,
    type: 'LIMIT',
    price: 10,
    status: 'PENDING',
    created_at: '2026-11-01T03:06:55.000Z',
  }),
  order({
    id: 4,
    type: 'LIMIT',
    side: 'SELL',
    price: 10,
    status: 'REJECTED',
    created_at: '2026-11-01T01:00:00.000Z',
  }),
];

let client: ReturnType<typeof createQueryClient>;
let fetchMock: jest.Mock;
let ordersBody: unknown;

async function renderScreen() {
  await render(
    <QueryClientProvider client={client}>
      <OrdersScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  ordersBody = orders;
  fetchMock = jest.fn(async (url: string) =>
    url.endsWith('/orders') ? fakeResponse(ordersBody) : fakeResponse(instrumentsOff),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  client.clear();
});

describe('OrdersScreen', () => {
  it('muestra un indicador mientras carga', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Cargando órdenes')).toBeOnTheScreen();
    expect(await screen.findByText('Compra CAPX')).toBeOnTheScreen(); // espera a que termine
  });

  it('lista cada orden con ticker, cantidad, tipo y estado en lenguaje amigable', async () => {
    await renderScreen();

    expect(await screen.findByText('Compra CAPX')).toBeOnTheScreen();
    expect(screen.getByText('10 acciones · Mercado')).toBeOnTheScreen();
    expect(screen.getByText('Venta GARO')).toBeOnTheScreen();
    expect(screen.getAllByText('1 acción · Límite')).toHaveLength(2); // las órdenes 3 y 4
    expect(screen.getAllByText('Ejecutada')).toHaveLength(2); // las órdenes 1 y 2
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Rechazada')).toBeOnTheScreen();
  });

  it('nunca muestra los códigos técnicos de estado', async () => {
    await renderScreen();
    await screen.findByText('Compra CAPX');

    expect(screen.queryByText(/FILLED|PENDING|REJECTED/)).not.toBeOnTheScreen();
  });

  it('ordena de la más nueva a la más vieja, aunque la API las mande desordenadas', async () => {
    await renderScreen();
    await screen.findByText('Compra CAPX');

    const ids = screen.getByTestId('orders-list').props.data.map((i: { id: number }) => i.id);

    expect(ids).toEqual([3, 2, 4, 1]);
  });

  it('muestra la fecha en la hora local', async () => {
    await renderScreen();

    expect(
      await screen.findByText(formatDateTime(new Date('2026-11-01T02:08:13.716Z'))),
    ).toBeOnTheScreen();
  });

  it('una límite ejecutada es válida en el historial; una a mercado en espera es un estado inesperado', async () => {
    ordersBody = [
      order({ id: 1, type: 'LIMIT', price: 10, status: 'FILLED' }),
      order({ id: 2, status: 'PENDING', instrument_id: 2 }),
    ];
    await renderScreen();

    expect(await screen.findByText('Ejecutada')).toBeOnTheScreen();
    expect(screen.getByText('Estado inesperado')).toBeOnTheScreen();
  });

  it('un instrumento que no está en la lista se muestra con un guion, sin inventar un nombre', async () => {
    ordersBody = [order({ id: 1, instrument_id: 9999 })];
    await renderScreen();

    expect(await screen.findByText('Compra —')).toBeOnTheScreen();
  });

  it('cada fila se lee completa para un lector de pantalla', async () => {
    ordersBody = [order({ id: 1, created_at: '2026-11-01T03:06:00.000Z' })];
    await renderScreen();

    const when = formatDateTime(new Date('2026-11-01T03:06:00.000Z'));
    expect(
      await screen.findByLabelText(`Compra GARO, 1 acción, Mercado, Ejecutada, $ 27,12, ${when}`),
    ).toBeOnTheScreen();
  });

  it('sin órdenes lo informa', async () => {
    ordersBody = [];
    await renderScreen();

    expect(await screen.findByText('Todavía no hiciste órdenes.')).toBeOnTheScreen();
  });

  it('si falla el pedido de órdenes muestra el error y permite reintentar', async () => {
    ordersBody = { error: 'caído' };
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/orders')
        ? fakeResponse({ error: 'caído' }, 400)
        : fakeResponse(instrumentsOff),
    );
    await renderScreen();
    expect(await screen.findByText('caído')).toBeOnTheScreen();

    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/orders') ? fakeResponse(orders) : fakeResponse(instrumentsOff),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Compra CAPX')).toBeOnTheScreen();
  });

  it('si falla la lista de instrumentos no muestra el historial a medias: error y reintentar', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/orders') ? fakeResponse(orders) : fakeResponse({ error: 'sin lista' }, 400),
    );
    await renderScreen();

    expect(await screen.findByText('sin lista')).toBeOnTheScreen();
    expect(screen.queryByText('Compra CAPX')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
  });
});

// Deja los pedidos colgados hasta que el test los libere; cada uno responde según su URL.
function hangRequests() {
  const pending: (() => void)[] = [];
  fetchMock.mockImplementation(
    (url: string) =>
      new Promise<Response>((resolve) => {
        pending.push(() =>
          resolve(url.endsWith('/orders') ? fakeResponse(orders) : fakeResponse(instrumentsOff)),
        );
      }),
  );
  return { release: () => pending.splice(0).forEach((resolve) => resolve()) };
}

describe('OrdersScreen: indicador de actualización', () => {
  const refreshing = () => screen.getByTestId('orders-list').props.refreshControl.props.refreshing;

  it('un refresco en segundo plano NO muestra el spinner de tirar para actualizar', async () => {
    await renderScreen();
    await screen.findByText('Compra CAPX');
    const pending = hangRequests();

    await act(async () => {
      void client.refetchQueries({ queryKey: ['orders'] });
    });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(refreshing()).toBe(false);

    pending.release();
    await waitFor(() => expect(client.isFetching()).toBe(0));
  });

  it('al tirar para actualizar sí lo muestra y lo oculta al terminar', async () => {
    await renderScreen();
    await screen.findByText('Compra CAPX');
    const pending = hangRequests();

    await act(async () => {
      screen.getByTestId('orders-list').props.refreshControl.props.onRefresh();
    });
    await waitFor(() => expect(refreshing()).toBe(true));

    pending.release();
    await waitFor(() => expect(refreshing()).toBe(false));
  });
});

describe('OrdersScreen: color del estado de cada orden', () => {
  it.each(['light', 'dark'] as const)(
    'ejecutada en verde, pendiente en ámbar y rechazada en rojo (tema %s)',
    async (scheme) => {
      useSettings.setState({ theme: scheme });
      await renderScreen();
      await screen.findByText('Compra CAPX');
      const colors = palettes[scheme];

      for (const done of screen.getAllByText('Ejecutada')) {
        expect(done).toHaveStyle({ color: colors.positive });
      }
      expect(screen.getByText('Pendiente')).toHaveStyle({ color: colors.pending });
      expect(screen.getByText('Rechazada')).toHaveStyle({ color: colors.negative });
    },
  );

  it('los tres se distinguen entre sí (no solo por el texto)', async () => {
    await renderScreen();
    await screen.findByText('Compra CAPX');

    const used = ['Ejecutada', 'Pendiente', 'Rechazada'].map(
      (label) => screen.getAllByText(label)[0].props.style.color ?? '',
    );

    expect(new Set(used).size).toBe(3);
  });

  it('un estado inesperado (a mercado en espera) sigue en rojo y no se confunde con una pendiente', async () => {
    ordersBody = [order({ id: 9, type: 'MARKET', status: 'PENDING' })];
    await renderScreen();

    expect(await screen.findByText('Estado inesperado')).toHaveStyle({
      color: palettes.light.negative,
    });
    expect(screen.queryByText('Pendiente')).not.toBeOnTheScreen();
  });
});
