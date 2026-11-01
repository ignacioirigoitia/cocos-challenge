import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
let onSelect: jest.Mock;

async function renderScreen() {
  await render(
    <QueryClientProvider client={client}>
      <InstrumentsScreen onSelect={onSelect} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  client = createQueryClient();
  onSelect = jest.fn();
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

describe('InstrumentsScreen: búsqueda', () => {
  const capx = instruments[1];
  const mirgEnSearch = { ...instruments[2], last_price: 40.88 }; // /search no tiene el defecto

  // Responde la lista a /instruments y `searchBody` a /search.
  function respondTo(searchBody: unknown, searchStatus = 200) {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/search') ? fakeResponse(searchBody, searchStatus) : fakeResponse(instruments),
    );
  }
  const searchUrls = () =>
    fetchMock.mock.calls.map((c) => c[0] as string).filter((u) => u.includes('/search'));
  const type = (text: string) =>
    fireEvent.changeText(screen.getByLabelText('Buscar por ticker'), text);

  it('al escribir muestra los resultados que devuelve el servidor', async () => {
    respondTo([capx]);
    await renderScreen();
    await screen.findByText('DYCA');

    await type('cap');

    await waitFor(() => expect(screen.queryByText('DYCA')).not.toBeOnTheScreen());
    expect(await screen.findByText('CAPX')).toBeOnTheScreen();
    expect(searchUrls()).toEqual(['https://dummy-api-topaz.vercel.app/search?query=cap']);
  });

  it('no consulta en cada tecla: espera a que termine de escribir', async () => {
    respondTo([capx]);
    await renderScreen();
    await screen.findByText('DYCA');

    await type('c');
    await type('ca');
    await type('cap');

    await waitFor(() => expect(searchUrls()).toHaveLength(1));
    expect(searchUrls()[0]).toContain('query=cap');
    // Se espera a que el resultado se dibuje para no dejar actualizaciones fuera del test.
    expect(await screen.findByText('CAPX')).toBeOnTheScreen();
  });

  it('con el campo vacío no consulta a /search', async () => {
    respondTo([capx]);
    await renderScreen();
    await screen.findByText('DYCA');

    expect(searchUrls()).toHaveLength(0);
  });

  it('si no hay resultados lo informa con el texto buscado', async () => {
    respondTo([]);
    await renderScreen();
    await screen.findByText('DYCA');

    await type('zzz');

    expect(await screen.findByText('No encontramos instrumentos con "zzz".')).toBeOnTheScreen();
  });

  it('el botón de borrar limpia el campo y vuelve a la lista completa', async () => {
    respondTo([capx]);
    await renderScreen();
    await screen.findByText('DYCA');
    await type('cap');
    await waitFor(() => expect(screen.queryByText('DYCA')).not.toBeOnTheScreen());

    await fireEvent.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));

    expect(await screen.findByText('DYCA')).toBeOnTheScreen();
    expect(screen.getByLabelText('Buscar por ticker').props.value).toBe('');
  });

  it('ante un error de la búsqueda muestra el mensaje y permite reintentar', async () => {
    // 400 y no 500: un 5xx se reintenta con espera creciente (ver retry.test.ts) y demoraría el test.
    respondTo({ error: 'Búsqueda inválida' }, 400);
    await renderScreen();
    await screen.findByText('DYCA');
    await type('cap');

    expect(await screen.findByText('Búsqueda inválida')).toBeOnTheScreen();

    respondTo([capx]);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('CAPX')).toBeOnTheScreen();
  });

  // Defecto conocido de la API (ver api-notes.md): /instruments y /search no coinciden en los
  // modos con bugs. Cada pantalla muestra lo que dice su endpoint, validado por separado.
  it('muestra el precio que informa /search aunque /instruments tenga el instrumento roto', async () => {
    respondTo([mirgEnSearch]);
    await renderScreen();
    await screen.findByText('MIRG');
    expect(screen.getAllByText('--')).toHaveLength(2); // en la lista, MIRG no tiene precio

    await type('mirg');

    expect(await screen.findByText('$ 40,88')).toBeOnTheScreen();
    expect(screen.queryByText('--')).not.toBeOnTheScreen();
  });
});

describe('InstrumentsScreen: abrir la orden', () => {
  it('al tocar una fila avisa qué instrumento se eligió', async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(/^DYCA,/));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 1, ticker: 'DYCA' });
  });

  it('un instrumento sin precio también se puede tocar: el modal explica por qué no se opera', async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(/^MIRG,/));

    expect(onSelect.mock.calls[0][0]).toMatchObject({ ticker: 'MIRG', lastPrice: null });
  });

  it('también se puede elegir un resultado de la búsqueda', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/search') ? fakeResponse([instruments[1]]) : fakeResponse(instruments),
    );
    await renderScreen();
    await screen.findByText('DYCA');
    await fireEvent.changeText(screen.getByLabelText('Buscar por ticker'), 'cap');
    await waitFor(() => expect(screen.queryByText('DYCA')).not.toBeOnTheScreen());

    await fireEvent.press(await screen.findByLabelText(/^CAPX,/));

    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 2, ticker: 'CAPX' });
  });
});
