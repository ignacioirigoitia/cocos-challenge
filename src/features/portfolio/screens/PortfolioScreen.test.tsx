import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';
import { palettes } from '@/shared/ui/theme';

import hardSinTicker from '../__fixtures__/portfolio.hard-sin-ticker.json';
import real from '../__fixtures__/portfolio.real.json';
import { PortfolioScreen } from './PortfolioScreen';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

// Casos armados a mano (no son respuestas reales de la API).
const garo = real.holdings[0];
const conGanancia = {
  cash: 1000,
  holdings: [{ ...garo, quantity: 10, last_price: 27.12, avg_cost_price: 25 }],
};
const sinPrecio = {
  cash: 1000,
  holdings: [{ ...garo, instrument_id: 5, ticker: 'MIRG', last_price: 0 }, { ...garo }],
};

interface Body {
  body: unknown;
  status?: number;
}

// Compras y ventas de prueba (armadas a mano) para el gráfico de capital invertido.
const compra = {
  id: 1,
  instrument_id: 16,
  side: 'BUY',
  type: 'MARKET',
  quantity: 10,
  price: 53.68,
  status: 'FILLED',
  created_at: '2026-10-31T10:00:00',
};
const venta = {
  ...compra,
  id: 2,
  side: 'SELL',
  quantity: 4,
  price: 60,
  created_at: '2026-11-01T10:00:00',
};

let client: ReturnType<typeof createQueryClient>;
let fetchMock: jest.Mock;
let onSelect: jest.Mock;

async function renderScreen() {
  await render(
    <QueryClientProvider client={client}>
      <PortfolioScreen onSelect={onSelect} />
    </QueryClientProvider>,
  );
}

// Sirve /portfolio y /orders por separado. Con varios portfolio, los va dando en orden y repite el último.
function serve(portfolio: Body | Body[], orders: Body = { body: [] }) {
  const queue = Array.isArray(portfolio) ? [...portfolio] : [portfolio];
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).includes('/orders')) return fakeResponse(orders.body, orders.status);
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    return fakeResponse(next.body, next.status);
  });
}
const callsTo = (path: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith(path)).length;

beforeEach(() => {
  client = createQueryClient();
  onSelect = jest.fn();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn();
  serve({ body: real });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => client.clear());

describe('PortfolioScreen', () => {
  it('muestra un indicador mientras carga', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Cargando portfolio')).toBeOnTheScreen();
    expect(await screen.findByText('GARO')).toBeOnTheScreen(); // espera a que termine
  });

  it('muestra el valor total, el efectivo y la posición', async () => {
    await renderScreen();

    expect(await screen.findByText('GARO')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total, $ 1.000.000,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Efectivo disponible, $ 999.972,88')).toBeOnTheScreen();
    expect(screen.getByText('1 acción')).toBeOnTheScreen();
    expect(screen.getByText('$ 27,12')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('GARO, 1 acción, valor $ 27,12, resultado $ 0,00 · 0,00%'),
    ).toBeOnTheScreen();
  });

  it('muestra ganancia y rendimiento con signo', async () => {
    serve({ body: conGanancia });
    await renderScreen();

    expect(await screen.findByText('10 acciones')).toBeOnTheScreen();
    expect(screen.getByText('$ 271,20')).toBeOnTheScreen();
    expect(screen.getByText('+$ 21,20 · +8,48%')).toBeOnTheScreen();
  });

  it('una posición sin precio muestra "--", el total queda en "--" y el efectivo se mantiene', async () => {
    serve({ body: sinPrecio });
    await renderScreen();

    expect(await screen.findByText('MIRG')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total, --')).toBeOnTheScreen();
    expect(screen.getByLabelText('Efectivo disponible, $ 1.000,00')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^MIRG, 1 acción, sin valor/)).toBeOnTheScreen();
    expect(screen.queryByText('$ 0,00')).not.toBeOnTheScreen();
  });

  it('sin posiciones lo informa y muestra el efectivo como total', async () => {
    serve({ body: { cash: 1000000, holdings: [] } });
    await renderScreen();

    expect(await screen.findByText('Todavía no tenés posiciones.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total, $ 1.000.000,00')).toBeOnTheScreen();
  });

  it('ante un error muestra el mensaje y permite reintentar', async () => {
    serve([{ body: { error: 'Missing header' }, status: 400 }, { body: real }]);
    await renderScreen();

    expect(await screen.findByText('Missing header')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('GARO')).toBeOnTheScreen();
    expect(callsTo('/portfolio')).toBe(2);
  });
});

describe('PortfolioScreen: vender desde una posición', () => {
  it('al tocar una posición avisa cuál se eligió', async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(/^GARO, 1 acción/));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ instrumentId: 16, ticker: 'GARO' });
  });
});

describe('PortfolioScreen: indicador de actualización', () => {
  it('un refresco en segundo plano NO muestra el spinner de tirar para actualizar', async () => {
    await renderScreen();
    await screen.findByText('GARO');
    const releases: (() => void)[] = [];
    fetchMock.mockImplementation(
      (url: string) =>
        new Promise<Response>((resolve) => {
          const body = String(url).includes('/orders') ? [] : real;
          releases.push(() => resolve(fakeResponse(body)));
        }),
    );

    await act(async () => {
      void client.refetchQueries({ queryKey: ['portfolio'] });
    });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    // React Query avisa a la pantalla en un paso asíncrono: se lo deja terminar antes de mirar.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByTestId('portfolio-list').props.refreshControl.props.refreshing).toBe(false);

    releases.forEach((release) => release());
    await waitFor(() => expect(client.isFetching()).toBe(0));
  });

  it('al tirar para actualizar sí lo muestra y lo oculta al terminar', async () => {
    await renderScreen();
    await screen.findByText('GARO');
    const releases: (() => void)[] = [];
    fetchMock.mockImplementation(
      (url: string) =>
        new Promise<Response>((resolve) => {
          const body = String(url).includes('/orders') ? [] : real;
          releases.push(() => resolve(fakeResponse(body)));
        }),
    );

    await act(async () => {
      screen.getByTestId('portfolio-list').props.refreshControl.props.onRefresh();
    });
    await waitFor(() =>
      expect(screen.getByTestId('portfolio-list').props.refreshControl.props.refreshing).toBe(true),
    );

    releases.forEach((release) => release());
    await waitFor(() =>
      expect(screen.getByTestId('portfolio-list').props.refreshControl.props.refreshing).toBe(
        false,
      ),
    );
  });
});

describe('PortfolioScreen: respuesta real de X-Enable-Bugs: hard', () => {
  it('si una posición llega sin ticker, avisa que hubo un error y permite volver a intentar', async () => {
    // El defecto de hard es intermitente: el primer pedido viene roto, el siguiente bien.
    serve([{ body: hardSinTicker }, { body: real }]);
    await renderScreen();

    expect(await screen.findByText('Recibimos datos con un formato inesperado.')).toBeOnTheScreen();
    expect(screen.queryByText(/Instrumento #/)).not.toBeOnTheScreen(); // no se inventa un nombre

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('GARO')).toBeOnTheScreen();
    expect(callsTo('/portfolio')).toBe(2);
  });
});

describe('PortfolioScreen: orden alfabético', () => {
  it('las posiciones se muestran ordenadas alfabéticamente por ticker', async () => {
    // La API manda GARO primero y después CAPX.
    serve({
      body: {
        cash: 1000,
        holdings: [
          { ...garo, instrument_id: 16, ticker: 'GARO' },
          { ...garo, instrument_id: 2, ticker: 'CAPX' },
          { ...garo, instrument_id: 1, ticker: 'ARS' },
        ],
      },
    });
    await renderScreen();
    await screen.findByText('GARO');

    const tickers = screen
      .getByTestId('portfolio-list')
      .props.data.map((h: { ticker: string }) => h.ticker);

    expect(tickers).toEqual(['ARS', 'CAPX', 'GARO']);
  });
});

describe('PortfolioScreen: rendimiento de la cuenta', () => {
  const rendimiento = (text: string) =>
    `Rendimiento de la cuenta, ${text}, contra un capital inicial de $ 1.000.000,00`;

  it('si el total coincide con el capital inicial, el rendimiento es 0', async () => {
    await renderScreen(); // efectivo 999.972,88 + GARO 27,12 = 1.000.000,00

    expect(await screen.findByLabelText(rendimiento('$ 0,00 · 0,00%'))).toBeOnTheScreen();
    expect(screen.getByText('Capital inicial $ 1.000.000,00')).toBeOnTheScreen();
  });

  it('una ganancia se muestra con signo y en verde', async () => {
    serve({
      body: {
        cash: 1000000,
        holdings: [{ ...garo, quantity: 10, last_price: 27.12, avg_cost_price: 25 }],
      },
    });
    await renderScreen();

    const text = await screen.findByText('+$ 271,20 · +0,03%');

    expect(screen.getByLabelText(rendimiento('+$ 271,20 · +0,03%'))).toBeOnTheScreen();
    expect(text).toHaveStyle({ color: palettes.light.positive });
  });

  it('una pérdida se muestra con signo y en rojo', async () => {
    serve({ body: { cash: 990000, holdings: [] } });
    await renderScreen();

    const text = await screen.findByText('-$ 10.000,00 · -1,00%');

    expect(text).toHaveStyle({ color: palettes.light.negative });
  });

  it('si falta algún precio no hay total y tampoco rendimiento: "--" y no un 0 inventado', async () => {
    serve({ body: sinPrecio });
    await renderScreen();

    expect(await screen.findByLabelText(rendimiento('sin dato'))).toBeOnTheScreen();
  });
});

describe('PortfolioScreen: gráfico de capital invertido', () => {
  it('mientras cargan los movimientos muestra un indicador y el portfolio ya se ve', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('/orders')
        ? new Promise<Response>(() => undefined)
        : Promise.resolve(fakeResponse(real)),
    );
    await renderScreen();

    expect(await screen.findByText('GARO')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando movimientos')).toBeOnTheScreen();
  });

  it('con órdenes ejecutadas dibuja el gráfico y resume cuántos movimientos hubo y cuánto hay invertido', async () => {
    serve({ body: real }, { body: [venta, compra] }); // la API las puede mandar en cualquier orden
    await renderScreen();

    expect(
      await screen.findByLabelText('Gráfico del capital invertido, 2 movimientos, ahora $ 296,80'),
    ).toBeOnTheScreen();
    expect(screen.getByText('31/10')).toBeOnTheScreen();
    expect(screen.getByText('01/11')).toBeOnTheScreen();
  });

  it('dibuja la línea en escalones: arranca en 0, sube con la compra y baja con la venta', async () => {
    serve({ body: real }, { body: [compra, venta] });
    await renderScreen();
    await screen.findByLabelText(/^Gráfico del capital invertido/);

    // El ancho llega recién con el layout.
    await fireEvent(screen.getByTestId('invested-chart'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 120 } },
    });

    const d: string = screen.getByTestId('invested-line').props.d;
    expect(d.startsWith('M 8 112 H 150 V 8 H 292 V ')).toBe(true);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('con un solo movimiento lo dice en singular', async () => {
    serve({ body: real }, { body: [compra] });
    await renderScreen();

    expect(
      await screen.findByLabelText('Gráfico del capital invertido, 1 movimiento, ahora $ 536,80'),
    ).toBeOnTheScreen();
  });

  it('sin órdenes ejecutadas lo avisa en vez de dibujar un gráfico vacío', async () => {
    serve({ body: real }, { body: [{ ...compra, status: 'REJECTED', type: 'LIMIT' }] });
    await renderScreen();

    expect(await screen.findByText('Todavía no hay movimientos.')).toBeOnTheScreen();
  });

  it('si fallan los movimientos, el portfolio sigue funcionando y se puede reintentar', async () => {
    serve({ body: real }, { body: { error: 'Missing header' }, status: 400 });
    await renderScreen();

    expect(await screen.findByText('No pudimos cargar los movimientos.')).toBeOnTheScreen();
    expect(screen.getByText('GARO')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Valor total/)).toBeOnTheScreen();

    serve({ body: real }, { body: [compra] });
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByLabelText(/^Gráfico del capital invertido/)).toBeOnTheScreen();
  });

  it('usa el mismo caché que el historial: un solo pedido a /orders por pantalla', async () => {
    await renderScreen();
    await screen.findByText('GARO');

    expect(callsTo('/orders')).toBe(1);
  });
});
