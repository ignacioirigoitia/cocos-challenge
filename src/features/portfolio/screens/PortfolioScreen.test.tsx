import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

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

beforeEach(() => {
  client = createQueryClient();
  onSelect = jest.fn();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn(async () => fakeResponse(real));
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
    expect(screen.getByText('$ 0,00 · 0,00%')).toBeOnTheScreen();
  });

  it('muestra ganancia y rendimiento con signo', async () => {
    fetchMock.mockResolvedValue(fakeResponse(conGanancia));
    await renderScreen();

    expect(await screen.findByText('10 acciones')).toBeOnTheScreen();
    expect(screen.getByText('$ 271,20')).toBeOnTheScreen();
    expect(screen.getByText('+$ 21,20 · +8,48%')).toBeOnTheScreen();
  });

  it('una posición sin precio muestra "--", el total queda en "--" y el efectivo se mantiene', async () => {
    fetchMock.mockResolvedValue(fakeResponse(sinPrecio));
    await renderScreen();

    expect(await screen.findByText('MIRG')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total, --')).toBeOnTheScreen();
    expect(screen.getByLabelText('Efectivo disponible, $ 1.000,00')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^MIRG, 1 acción, sin valor/)).toBeOnTheScreen();
    expect(screen.queryByText('$ 0,00')).not.toBeOnTheScreen();
  });

  it('sin posiciones lo informa y muestra el efectivo como total', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ cash: 1000000, holdings: [] }));
    await renderScreen();

    expect(await screen.findByText('Todavía no tenés posiciones.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor total, $ 1.000.000,00')).toBeOnTheScreen();
  });

  it('ante un error muestra el mensaje y permite reintentar', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ error: 'Missing header' }, 400));
    await renderScreen();

    expect(await screen.findByText('Missing header')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('GARO')).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    let release: () => void = () => undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(fakeResponse(real));
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

    release();
    await waitFor(() => expect(client.isFetching()).toBe(0));
  });

  it('al tirar para actualizar sí lo muestra y lo oculta al terminar', async () => {
    await renderScreen();
    await screen.findByText('GARO');
    let release: () => void = () => undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(fakeResponse(real));
        }),
    );

    await act(async () => {
      screen.getByTestId('portfolio-list').props.refreshControl.props.onRefresh();
    });
    await waitFor(() =>
      expect(screen.getByTestId('portfolio-list').props.refreshControl.props.refreshing).toBe(true),
    );

    release();
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
    fetchMock
      .mockResolvedValueOnce(fakeResponse(hardSinTicker))
      .mockResolvedValue(fakeResponse(real));
    await renderScreen();

    expect(await screen.findByText('Recibimos datos con un formato inesperado.')).toBeOnTheScreen();
    expect(screen.queryByText(/Instrumento #/)).not.toBeOnTheScreen(); // no se inventa un nombre

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('GARO')).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
