import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

import { InstrumentsScreen } from './InstrumentsScreen';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const instruments = [
  {
    id: 1,
    ticker: 'DYCA',
    name: 'Dycasa S.A.',
    type: 'ACCIONES',
    last_price: 45.72,
    close_price: 50.07,
  },
  {
    id: 2,
    ticker: 'CAPX',
    name: 'Capex S.A.',
    type: 'ACCIONES',
    last_price: 53.68,
    close_price: 49.71,
  },
  { id: 5, ticker: 'MIRG', name: 'Mirgor', type: 'ACCIONES', last_price: 0, close_price: 37.74 },
  { id: 26, ticker: 'ARS', name: 'Pesos', type: 'MONEDA', last_price: 1, close_price: 1 },
];

let client: ReturnType<typeof createQueryClient>;
let fetchMock: jest.Mock;

async function renderScreen() {
  await render(
    <QueryClientProvider client={client}>
      <InstrumentsScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  fetchMock = jest.fn(async () => fakeResponse(instruments));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => client.clear());

describe('InstrumentsScreen', () => {
  it('muestra un indicador mientras carga', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Cargando instrumentos')).toBeOnTheScreen();

    // Se espera a que termine para no dejar actualizaciones pendientes fuera del test.
    expect(await screen.findByText('DYCA')).toBeOnTheScreen();
  });

  it('lista ticker, nombre, último precio y retorno de cada instrumento', async () => {
    await renderScreen();

    expect(await screen.findByText('DYCA')).toBeOnTheScreen();
    expect(screen.getByText('Dycasa S.A.')).toBeOnTheScreen();
    expect(screen.getByText('$ 45,72')).toBeOnTheScreen();
    expect(screen.getByText('-8,69%')).toBeOnTheScreen();
    expect(screen.getByText('+7,99%')).toBeOnTheScreen();
  });

  it('un instrumento sin precio (last_price en 0) muestra "--" y no un retorno falso', async () => {
    await renderScreen();
    await screen.findByText('MIRG');

    expect(screen.getAllByText('--')).toHaveLength(2); // precio y retorno
    expect(screen.queryByText('-100,00%')).not.toBeOnTheScreen();
  });

  it('ARS aparece como un instrumento más, con retorno 0', async () => {
    await renderScreen();

    expect(await screen.findByText('ARS')).toBeOnTheScreen();
    expect(screen.getByText('$ 1,00')).toBeOnTheScreen();
    expect(screen.getByText('0,00%')).toBeOnTheScreen();
  });

  it('cada fila es accesible: lee ticker, nombre, precio y retorno juntos', async () => {
    await renderScreen();

    expect(
      await screen.findByLabelText('DYCA, Dycasa S.A., $ 45,72, retorno -8,69%'),
    ).toBeOnTheScreen();
  });

  it('con una lista vacía lo informa', async () => {
    fetchMock.mockResolvedValue(fakeResponse([]));
    await renderScreen();

    expect(await screen.findByText('No hay instrumentos para mostrar.')).toBeOnTheScreen();
  });

  it('ante un error muestra el mensaje y permite reintentar', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse({ error: 'Missing header' }, 400));
    await renderScreen();

    expect(await screen.findByText('Missing header')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('DYCA')).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
