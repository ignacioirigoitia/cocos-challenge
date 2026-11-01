import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';
import { palettes } from '@/shared/ui/theme';

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

describe('InstrumentsScreen: ordenar por variación del día', () => {
  // La lista de prueba: DYCA baja (-8,69%), CAPX sube (+7,99%), MIRG no tiene precio y ARS no varió.
  const tickersShown = () =>
    screen.getByTestId('instruments-list').props.data.map((i: { ticker: string }) => i.ticker);
  const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));

  it('ofrece tres formas de ordenar y arranca en A–Z', async () => {
    await renderScreen();
    await screen.findByText('DYCA');

    // El grupo no es "accesible" a propósito (si lo fuera, el lector no leería cada opción).
    expect(screen.getByLabelText('Ordenar por').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('radio', { name: 'A–Z' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Mayores subas' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Mayores bajas' })).toBeOnTheScreen();
    expect(tickersShown()).toEqual(['ARS', 'CAPX', 'DYCA', 'MIRG']);
  });

  it('"Mayores subas" muestra solo los que subieron', async () => {
    await renderScreen();
    await screen.findByText('DYCA');

    await choose('Mayores subas');

    expect(tickersShown()).toEqual(['CAPX']); // no entran DYCA (bajó), ARS (0%) ni MIRG (sin precio)
  });

  it('"Mayores bajas" muestra solo los que bajaron', async () => {
    await renderScreen();
    await screen.findByText('DYCA');

    await choose('Mayores bajas');

    expect(tickersShown()).toEqual(['DYCA']);
  });

  it('volver a A–Z muestra todos de nuevo', async () => {
    await renderScreen();
    await screen.findByText('DYCA');
    await choose('Mayores bajas');

    await choose('A–Z');

    expect(tickersShown()).toHaveLength(4);
  });

  it('si ninguno bajó, lo dice en vez de mostrar una lista vacía', async () => {
    fetchMock.mockResolvedValue(fakeResponse([instruments[1]])); // solo CAPX, que subió
    await renderScreen();
    await screen.findByText('CAPX');

    await choose('Mayores bajas');

    expect(await screen.findByText('Ningún instrumento bajó hoy.')).toBeOnTheScreen();
  });

  it('si ninguno subió, lo dice', async () => {
    fetchMock.mockResolvedValue(fakeResponse([instruments[0]])); // solo DYCA, que bajó
    await renderScreen();
    await screen.findByText('DYCA');

    await choose('Mayores subas');

    expect(await screen.findByText('Ningún instrumento subió hoy.')).toBeOnTheScreen();
  });

  it('"Mayores subas" va en verde y "Mayores bajas" en rojo cuando están elegidas', async () => {
    await renderScreen();
    await screen.findByText('DYCA');

    await choose('Mayores subas');
    expect(screen.getByRole('radio', { name: 'Mayores subas' })).toHaveStyle({
      backgroundColor: palettes.light.positive,
    });

    await choose('Mayores bajas');
    expect(screen.getByRole('radio', { name: 'Mayores bajas' })).toHaveStyle({
      backgroundColor: palettes.light.negative,
    });
  });

  it('se combina con la búsqueda: ordena y filtra los resultados', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/search')
        ? fakeResponse([instruments[0], instruments[1]]) // DYCA y CAPX
        : fakeResponse(instruments),
    );
    await renderScreen();
    await screen.findByText('DYCA');
    await choose('Mayores subas');

    await fireEvent.changeText(screen.getByLabelText('Buscar por ticker'), 'c');

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/search'))).toBe(true),
    );
    await waitFor(() => expect(tickersShown()).toEqual(['CAPX']));
  });

  it('si ningún resultado de la búsqueda cumple, lo aclara con la búsqueda', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/search') ? fakeResponse([instruments[0]]) : fakeResponse(instruments),
    );
    await renderScreen();
    await screen.findByText('DYCA');
    await choose('Mayores subas');

    await fireEvent.changeText(screen.getByLabelText('Buscar por ticker'), 'dy');

    expect(await screen.findByText('Ningún resultado de la búsqueda subió hoy.')).toBeOnTheScreen();
  });

  it('si la búsqueda no encuentra nada, sigue diciendo que no encontró (no confunde con el orden)', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/search') ? fakeResponse([]) : fakeResponse(instruments),
    );
    await renderScreen();
    await screen.findByText('DYCA');
    await choose('Mayores subas');

    await fireEvent.changeText(screen.getByLabelText('Buscar por ticker'), 'zzz');

    expect(await screen.findByText('No encontramos instrumentos con "zzz".')).toBeOnTheScreen();
  });
});

describe('InstrumentsScreen: orden alfabético', () => {
  const tickersShown = () =>
    screen.getByTestId('instruments-list').props.data.map((i: { ticker: string }) => i.ticker);

  it('la lista se muestra ordenada alfabéticamente por ticker, venga como venga de la API', async () => {
    await renderScreen(); // la API los manda como DYCA, CAPX, MIRG, ARS
    await screen.findByText('DYCA');

    expect(tickersShown()).toEqual(['ARS', 'CAPX', 'DYCA', 'MIRG']);
  });

  it('los resultados de la búsqueda también van ordenados alfabéticamente', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/search')
        ? fakeResponse([instruments[2], instruments[1], instruments[0]])
        : fakeResponse(instruments),
    );
    await renderScreen();
    await screen.findByText('DYCA');

    await fireEvent.changeText(screen.getByLabelText('Buscar por ticker'), 'c');
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/search'))).toBe(true),
    );
    await waitFor(() => expect(tickersShown()).toEqual(['CAPX', 'DYCA', 'MIRG']));
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

  it('mientras llega la primera búsqueda se sigue viendo la lista completa, sin spinner', async () => {
    let release: () => void = () => undefined;
    fetchMock.mockImplementation((url: string) =>
      url.includes('/search')
        ? new Promise<Response>((resolve) => {
            release = () => resolve(fakeResponse([capx]));
          })
        : Promise.resolve(fakeResponse(instruments)),
    );
    await renderScreen();
    await screen.findByText('DYCA');

    await type('cap');
    await waitFor(() => expect(searchUrls()).toHaveLength(1)); // la búsqueda ya salió y no volvió

    expect(screen.getByText('DYCA')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cargando instrumentos')).not.toBeOnTheScreen();

    release();
    await waitFor(() => expect(screen.queryByText('DYCA')).not.toBeOnTheScreen());
    expect(await screen.findByText('CAPX')).toBeOnTheScreen();
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

  // Defecto conocido de la API (ver docs/api-notes.md): /instruments y /search no coinciden en los
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

describe('InstrumentsScreen: indicador de actualización', () => {
  // Deja el pedido de /instruments colgado hasta que el test lo libere.
  function hangRequests() {
    const state: { release: () => void } = { release: () => undefined };
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          state.release = () => resolve(fakeResponse(instruments));
        }),
    );
    return state;
  }
  const refreshing = () =>
    screen.getByTestId('instruments-list').props.refreshControl.props.refreshing;

  it('un refresco en segundo plano (ej. al revisar una orden) NO muestra el spinner de tirar para actualizar', async () => {
    await renderScreen();
    await screen.findByText('DYCA');
    const pending = hangRequests();

    await act(async () => {
      void client.refetchQueries({ queryKey: ['instruments'] });
    });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    // React Query avisa a la pantalla en un paso asíncrono: se lo deja terminar antes de mirar.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(refreshing()).toBe(false);

    pending.release();
    await waitFor(() => expect(client.isFetching()).toBe(0));
  });

  it('al tirar para actualizar sí lo muestra y lo oculta al terminar', async () => {
    await renderScreen();
    await screen.findByText('DYCA');
    const pending = hangRequests();

    await act(async () => {
      screen.getByTestId('instruments-list').props.refreshControl.props.onRefresh();
    });
    await waitFor(() => expect(refreshing()).toBe(true));

    pending.release();
    await waitFor(() => expect(refreshing()).toBe(false));
  });
});
