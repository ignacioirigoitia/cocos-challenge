import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Big } from 'big.js';

import { createQueryClient } from '@/shared/api/queryClient';
import { palettes } from '@/shared/ui/theme';
import { useSettings } from '@/shared/store/settings';

import hardMarketPending from '../__fixtures__/order.hard-market-pending.json';
import real from '../__fixtures__/order.real.json';
import type { OrderParams } from '../params';
import { OrderScreen } from './OrderScreen';

const initialSettings = useSettings.getState();

function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

const instrument = (price: number) => [
  {
    id: 16,
    ticker: 'GARO',
    name: 'Garovaglio S.A.',
    type: 'ACCIONES',
    last_price: price,
    close_price: 24.44,
  },
];
// Casos armados a mano (no son respuestas reales de la API), salvo la orden ejecutada.
const portfolio = {
  cash: 1000,
  holdings: [
    {
      instrument_id: 16,
      ticker: 'GARO',
      quantity: 5,
      last_price: 27.12,
      close_price: 24.44,
      avg_cost_price: 25,
    },
  ],
};
const order = (change: object = {}) => ({ ...real, quantity: 10, ...change });

const params: OrderParams = {
  instrumentId: 16,
  ticker: 'GARO',
  name: 'Garovaglio S.A.',
  lastPrice: new Big('27.12'),
  side: 'BUY',
};

let client: ReturnType<typeof createQueryClient>;
let fetchMock: jest.Mock;
let onClose: jest.Mock;
let freshPrice: number;
let orderResponse: () => Promise<Response>;

const calls = (method: string, path: string) =>
  fetchMock.mock.calls.filter(
    ([url, init]) =>
      (url as string).endsWith(path) && ((init as RequestInit).method ?? 'GET') === method,
  );

async function renderScreen(p: OrderParams = params) {
  await render(
    <QueryClientProvider client={client}>
      <OrderScreen params={p} onClose={onClose} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  client = createQueryClient();
  useSettings.setState(initialSettings, true);
  onClose = jest.fn();
  freshPrice = 27.12;
  orderResponse = async () => fakeResponse(order());
  fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/orders') && init?.method === 'POST') return orderResponse();
    if (url.endsWith('/portfolio')) return fakeResponse(portfolio);
    return fakeResponse(instrument(freshPrice));
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(async () => {
  // Tras enviar una orden la app refresca el portfolio por detrás: se espera a que termine para
  // que esa actualización no caiga en el test siguiente.
  await waitFor(() => expect(client.isFetching()).toBe(0));
  client.clear();
});

const type = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));

// Llena una compra a mercado de 10 acciones y llega hasta la pantalla de revisión.
async function goToReview(quantity = '10') {
  await renderScreen();
  await screen.findByText('Efectivo disponible');
  await type('Cantidad de acciones', quantity);
  await press('Revisar orden');
  return screen.findByText('Revisá tu orden');
}

async function confirm() {
  await goToReview();
  await press('Confirmar y enviar');
}

describe('OrderScreen: formulario', () => {
  it('muestra el instrumento, el precio de referencia y el efectivo disponible', async () => {
    await renderScreen();

    expect(await screen.findByText('Comprar GARO')).toBeOnTheScreen();
    expect(screen.getByText('Garovaglio S.A.')).toBeOnTheScreen();
    expect(screen.getByText('Precio de referencia $ 27,12')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Efectivo disponible, $ 1.000,00')).toBeOnTheScreen();
  });

  it('con el lado en vender, el título cambia', async () => {
    await renderScreen({ ...params, side: 'SELL' });

    expect(await screen.findByText('Vender GARO')).toBeOnTheScreen();
  });

  it('sin cantidad no avanza y lo explica', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');

    await press('Revisar orden');

    expect(await screen.findByText('Ingresá una cantidad mayor a 0.')).toBeOnTheScreen();
    expect(calls('GET', '/instruments')).toHaveLength(0);
  });

  it('si al revisar tenés menos efectivo que al abrir, no deja comprar más de lo que alcanza', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '36'); // con $ 1.000 el campo permite hasta 36
    // Entre abrir y revisar, tu efectivo bajó a $ 500.
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(url.endsWith('/portfolio') ? { ...portfolio, cash: 500 } : instrument(27.12)),
    );

    await press('Revisar orden');

    expect(
      await screen.findByText('No tenés efectivo suficiente. Necesitás $ 976,32 y tenés $ 500,00.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Revisá tu orden')).not.toBeOnTheScreen();
  });

  it('el precio límite aparece solo en las órdenes límite y es obligatorio', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    expect(screen.queryByLabelText('Precio límite')).not.toBeOnTheScreen();

    await choose('Límite');
    await type('Cantidad de acciones', '5');
    await press('Revisar orden');

    expect(
      await screen.findByText('Ingresá un precio límite mayor a 0, con hasta 2 decimales.'),
    ).toBeOnTheScreen();
  });

  it('por monto en pesos muestra la cantidad estimada de acciones enteras', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');

    await choose('Monto en $');
    await type('Monto en pesos', '800');

    expect(await screen.findByText('Cantidad estimada: 29 acciones')).toBeOnTheScreen();
  });

  it('si al revisar tenés menos acciones que al abrir, no deja vender más de las que quedan', async () => {
    await renderScreen({ ...params, side: 'SELL' });
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '5'); // el campo permite hasta 5: es lo que tenías
    // Entre abrir y revisar, tu cartera cambió: ahora quedan 3.
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(
        url.endsWith('/portfolio')
          ? { ...portfolio, holdings: [{ ...portfolio.holdings[0], quantity: 3 }] }
          : instrument(27.12),
      ),
    );

    await press('Revisar orden');

    expect(await screen.findByText('No tenés suficientes acciones. Tenés 3.')).toBeOnTheScreen();
    expect(screen.queryByText('Revisá tu orden')).not.toBeOnTheScreen();
  });

  it('sin precio no se puede operar', async () => {
    await renderScreen({ ...params, lastPrice: null });

    expect(
      await screen.findByText('Este instrumento no tiene precio disponible.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Revisar orden' })).not.toBeOnTheScreen();
    // Cerrar la hoja es responsabilidad de BottomSheet (ver BottomSheet.test y OrderModal.test).
  });

  it('si no se puede traer el portfolio, ofrece reintentar', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/portfolio')
        ? fakeResponse({ error: 'caído' }, 400)
        : fakeResponse(instrument(27.12)),
    );
    await renderScreen();

    expect(await screen.findByText('caído')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
  });
});

describe('OrderScreen: revisión', () => {
  it('trae datos frescos y muestra el resumen con el aviso de precio estimado', async () => {
    await goToReview();

    expect(calls('GET', '/instruments')).toHaveLength(1);
    expect(calls('GET', '/portfolio')).toHaveLength(2); // al abrir y al revisar
    expect(screen.getByText('Compra a mercado')).toBeOnTheScreen();
    expect(screen.getByText('10 acciones')).toBeOnTheScreen();
    expect(screen.getByText('$ 271,20')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'El precio final puede ser distinto: una orden a mercado se ejecuta al precio del momento.',
      ),
    ).toBeOnTheScreen();
  });

  it('si el precio cambió lo avisa y recalcula el costo', async () => {
    freshPrice = 27.4;
    await goToReview();

    expect(screen.getByText('El precio cambió de $ 27,12 a $ 27,40.')).toBeOnTheScreen();
    expect(screen.getByText('$ 274,00')).toBeOnTheScreen();
  });

  it('si con el precio nuevo la orden ya no es válida, vuelve al formulario con el error', async () => {
    freshPrice = 28; // 36 x 28 = 1008 > efectivo
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '36');

    await press('Revisar orden');

    expect(
      await screen.findByText(
        'No tenés efectivo suficiente. Necesitás $ 1.008,00 y tenés $ 1.000,00.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Revisá tu orden')).not.toBeOnTheScreen();
  });

  it('si no se puede actualizar el precio, no avanza y lo informa', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '10');
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/instruments')
        ? fakeResponse({ error: 'sin servicio' }, 400)
        : fakeResponse(portfolio),
    );

    await press('Revisar orden');

    expect(await screen.findByText(/No pudimos actualizar el precio/)).toBeOnTheScreen();
    expect(screen.queryByText('Revisá tu orden')).not.toBeOnTheScreen();
  });

  it('si el instrumento perdió el precio, no avanza', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '10');
    freshPrice = 0;

    await press('Revisar orden');

    expect(
      await screen.findByText('Este instrumento ya no tiene precio disponible.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Revisá tu orden')).not.toBeOnTheScreen();
  });

  it('"Volver" regresa al formulario conservando lo escrito', async () => {
    await goToReview('7');

    await press('Volver');

    expect(await screen.findByLabelText('Cantidad de acciones')).toHaveDisplayValue('7');
  });
});

describe('OrderScreen: resultado', () => {
  it('orden ejecutada: muestra el precio de ejecución y el total real, sin códigos técnicos', async () => {
    orderResponse = async () => fakeResponse(order({ price: 27.12 }));
    await confirm();

    expect(await screen.findByText('Orden ejecutada')).toBeOnTheScreen();
    expect(screen.getByText('Tu compra se realizó con éxito.')).toBeOnTheScreen();
    expect(screen.getByText('#147106')).toBeOnTheScreen();
    expect(screen.getByText('Precio de ejecución')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
    expect(screen.getByText('$ 271,20')).toBeOnTheScreen();
    expect(screen.queryByText(/FILLED/)).not.toBeOnTheScreen();
  });

  it('envía el POST con el body correcto y refresca el portfolio', async () => {
    await confirm();
    await screen.findByText('Orden ejecutada');

    const [post] = calls('POST', '/orders');
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({
      instrument_id: 16,
      side: 'BUY',
      type: 'MARKET',
      quantity: 10,
    });
    await waitFor(() => expect(calls('GET', '/portfolio').length).toBeGreaterThanOrEqual(3));
  });

  it('si el precio de ejecución difiere de lo estimado, lo muestra', async () => {
    orderResponse = async () => fakeResponse(order({ price: 27.5 }));
    await confirm();

    expect(await screen.findByText('Estimado en la revisión')).toBeOnTheScreen();
    expect(screen.getByText('$ 275,00')).toBeOnTheScreen(); // total real: 10 x 27,50
  });

  it('orden límite en espera: mensaje amigable y precio límite', async () => {
    orderResponse = async () =>
      fakeResponse(order({ type: 'LIMIT', price: 25.5, status: 'PENDING' }));
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    await choose('Límite');
    await type('Cantidad de acciones', '10');
    await type('Precio límite', '25,5');
    await press('Revisar orden');
    await screen.findByText('Revisá tu orden');
    await press('Confirmar y enviar');

    expect(await screen.findByText('Orden pendiente')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Tu orden quedó en espera. Se ejecutará cuando el mercado alcance tu precio.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Precio límite')).toBeOnTheScreen();
    expect(screen.queryByText('Total')).not.toBeOnTheScreen();
  });

  it('orden rechazada: mensaje amigable y sin totales', async () => {
    orderResponse = async () => fakeResponse(order({ status: 'REJECTED' }));
    await confirm();

    expect(await screen.findByText('Orden rechazada')).toBeOnTheScreen();
    expect(
      screen.getByText('El mercado no aceptó tu orden. Revisá tu portfolio e intentá de nuevo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Total')).not.toBeOnTheScreen();
  });

  it('estado que no conoce: avisa que verifique el portfolio', async () => {
    orderResponse = async () => fakeResponse(order({ status: 'CANCELLED' }));
    await confirm();

    expect(await screen.findByText('Estado inesperado')).toBeOnTheScreen();
  });

  it('en hard, una compra a mercado que vuelve PENDING no se muestra como "pendiente"', async () => {
    // Respuesta real de hard: la orden a mercado volvió PENDING aunque ya se había ejecutado.
    orderResponse = async () => fakeResponse(hardMarketPending);
    await goToReview('1');
    await press('Confirmar y enviar');

    expect(await screen.findByText('Estado inesperado')).toBeOnTheScreen();
    expect(screen.queryByText('Orden pendiente')).not.toBeOnTheScreen();
    expect(screen.queryByText('Precio límite')).not.toBeOnTheScreen();
    expect(screen.getByText(/Revisá tu portfolio/)).toBeOnTheScreen();
  });

  it('si la orden devuelta no coincide con la enviada, lo advierte', async () => {
    orderResponse = async () => fakeResponse(order({ quantity: 11 }));
    await confirm();

    expect(
      await screen.findByText(
        'Los datos devueltos no coinciden con tu orden. Revisá tu portfolio.',
      ),
    ).toBeOnTheScreen();
  });

  it('"Listo" cierra el modal', async () => {
    await confirm();
    await screen.findByText('Orden ejecutada');

    await press('Listo');

    expect(onClose).toHaveBeenCalled();
  });
});

describe('OrderScreen: errores al enviar', () => {
  it('error de red: avisa que no se sabe si llegó, y no reintenta solo', async () => {
    orderResponse = async () => {
      throw new TypeError('Network request failed');
    };
    await confirm();

    expect(
      await screen.findByText('No hay conexión. Revisá tu internet e intentá de nuevo.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'No sabemos si la orden llegó a enviarse. Revisá tu portfolio antes de volver a intentar.',
      ),
    ).toBeOnTheScreen();
    expect(calls('POST', '/orders')).toHaveLength(1);
  });

  it('error que rechaza el pedido (400): muestra el mensaje y no genera dudas', async () => {
    orderResponse = async () => fakeResponse({ error: 'Cantidad inválida' }, 400);
    await confirm();

    expect(await screen.findByText('Cantidad inválida')).toBeOnTheScreen();
    expect(screen.queryByText(/No sabemos si la orden llegó/)).not.toBeOnTheScreen();
  });

  it('un doble toque en confirmar envía una sola orden', async () => {
    let release: (r: Response) => void = () => undefined;
    orderResponse = () => new Promise<Response>((resolve) => (release = resolve));
    await goToReview();

    await press('Confirmar y enviar');
    // El botón pasa a "Enviando…" y queda deshabilitado: un segundo toque no hace nada.
    await fireEvent.press(await screen.findByRole('button', { name: 'Enviando…' }));

    expect(calls('POST', '/orders')).toHaveLength(1);
    release(fakeResponse(order()));
    expect(await screen.findByText('Orden ejecutada')).toBeOnTheScreen();
  });
});

describe('OrderScreen: comprar y vender', () => {
  const sinTenencias = { cash: 1000, holdings: [] };
  // Responde el portfolio indicado (por defecto el de los tests: 5 acciones de GARO).
  const withPortfolio = (body: object) =>
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(url.endsWith('/portfolio') ? body : instrument(27.12)),
    );

  it('Comprar va en verde y Vender en rojo cuando están elegidos', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    expect(screen.getByRole('radio', { name: 'Comprar' })).toHaveStyle({
      backgroundColor: palettes.light.positive,
    });

    await choose('Vender');

    expect(screen.getByRole('radio', { name: 'Vender' })).toHaveStyle({
      backgroundColor: palettes.light.negative,
    });
  });

  it('si tenés acciones del activo, Vender está habilitado', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');

    expect(screen.getByRole('radio', { name: 'Vender' })).not.toBeDisabled();
    await choose('Vender');
    expect(screen.getByText('Vender GARO')).toBeOnTheScreen();
  });

  it('si NO tenés el activo, Vender está deshabilitado y se explica por qué', async () => {
    withPortfolio(sinTenencias);
    await renderScreen();
    await screen.findByText('Efectivo disponible');

    expect(screen.getByRole('radio', { name: 'Vender' })).toBeDisabled();
    expect(screen.getByText('No tenés acciones de GARO para vender.')).toBeOnTheScreen();

    await choose('Vender');
    expect(screen.getByText('Comprar GARO')).toBeOnTheScreen(); // no cambió
  });

  it('con el activo en cartera no aparece el aviso', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');

    expect(screen.queryByText(/para vender/)).not.toBeOnTheScreen();
  });

  it('si se abre en modo venta pero no tenés el activo, arranca comprando', async () => {
    withPortfolio(sinTenencias);
    await renderScreen({ ...params, side: 'SELL' });
    await screen.findByText('Efectivo disponible');

    expect(await screen.findByText('Comprar GARO')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Comprar' })).toBeSelected();
  });
});

describe('OrderScreen: máximo al vender', () => {
  // La cartera de los tests tiene 5 acciones de GARO y el precio de referencia es $ 27,12.
  const input = (label: string) => screen.getByLabelText(label);

  async function openSell() {
    await renderScreen({ ...params, side: 'SELL' });
    await screen.findByText('Efectivo disponible');
  }

  it('al vender, la cantidad no puede superar las acciones que tenés', async () => {
    await openSell();

    await type('Cantidad de acciones', '9');

    expect(input('Cantidad de acciones')).toHaveDisplayValue('5');
  });

  it('una cantidad dentro de lo que tenés se respeta', async () => {
    await openSell();

    await type('Cantidad de acciones', '3');

    expect(input('Cantidad de acciones')).toHaveDisplayValue('3');
  });

  it('muestra el máximo permitido', async () => {
    await openSell();

    expect(screen.getByText('Máximo: 5 acciones')).toBeOnTheScreen();
  });

  it('por monto, no deja pasar del valor de todas tus acciones', async () => {
    await openSell();
    await choose('Monto en $');

    await type('Monto en pesos', '99999');

    expect(input('Monto en pesos')).toHaveDisplayValue('135,60'); // 5 x 27,12
    expect(screen.getByText('Máximo: $ 135,60')).toBeOnTheScreen();
  });

  it('al comprar el máximo es por efectivo, no por las acciones que tenés', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');

    await type('Cantidad de acciones', '9');

    expect(input('Cantidad de acciones')).toHaveDisplayValue('9'); // tenés 5, pero comprar no depende de eso
    expect(screen.getByText('Máximo: 36 acciones')).toBeOnTheScreen();
    expect(screen.queryByText('Máximo: 5 acciones')).not.toBeOnTheScreen();
  });
});

describe('OrderScreen: el instrumento del link tiene que ser el real', () => {
  // La API dice que el id 16 es GARO.
  async function reviewWith(p: OrderParams) {
    await renderScreen(p);
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '10');
    await press('Revisar orden');
  }

  it('si el ticker del link no corresponde al id, no avanza y lo explica', async () => {
    await reviewWith({ ...params, ticker: 'MIRG' }); // id de GARO con ticker de otro

    expect(
      await screen.findByText(
        'El instrumento no coincide con el que elegiste. Cerrá esta pantalla y volvé a abrirlo desde el listado.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Revisá tu orden')).not.toBeOnTheScreen();
    expect(calls('POST', '/orders')).toHaveLength(0);
  });

  it('un ticker en minúsculas del mismo instrumento es válido y la revisión muestra el real', async () => {
    await reviewWith({ ...params, ticker: 'garo' });

    expect(await screen.findByText('Revisá tu orden')).toBeOnTheScreen();
    expect(screen.getByText('GARO')).toBeOnTheScreen(); // el ticker de la API, no el del link
  });
});

describe('OrderScreen: máximo al comprar', () => {
  // Efectivo $ 1.000 y precio de referencia $ 27,12: alcanzan 36 acciones (976,32).
  const input = (label: string) => screen.getByLabelText(label);
  const withPortfolio = (body: object) =>
    fetchMock.mockImplementation(async (url: string) =>
      fakeResponse(url.endsWith('/portfolio') ? body : instrument(27.12)),
    );

  async function openBuy() {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
  }

  it('la cantidad no puede superar lo que alcanza con tu efectivo', async () => {
    await openBuy();

    await type('Cantidad de acciones', '99');

    expect(input('Cantidad de acciones')).toHaveDisplayValue('36');
    expect(screen.getByText('Máximo: 36 acciones')).toBeOnTheScreen();
  });

  it('una cantidad que alcanza se respeta', async () => {
    await openBuy();

    await type('Cantidad de acciones', '20');

    expect(input('Cantidad de acciones')).toHaveDisplayValue('20');
  });

  it('por monto, no deja pasar de tu efectivo', async () => {
    await openBuy();
    await choose('Monto en $');

    await type('Monto en pesos', '99999');

    expect(input('Monto en pesos')).toHaveDisplayValue('1000,00');
    expect(screen.getByText('Máximo: $ 1.000,00')).toBeOnTheScreen();
  });

  it('en una orden límite, mientras no haya precio no se limita nada', async () => {
    await openBuy();
    await choose('Límite');

    await type('Cantidad de acciones', '99');

    expect(input('Cantidad de acciones')).toHaveDisplayValue('99');
    expect(screen.queryByText(/Máximo/)).not.toBeOnTheScreen();
  });

  it('en una orden límite el máximo sale del precio límite', async () => {
    await openBuy();
    await choose('Límite');
    await type('Cantidad de acciones', '15');

    await type('Precio límite', '10'); // 1000 / 10 = 100
    expect(screen.getByText('Máximo: 100 acciones')).toBeOnTheScreen();
    expect(input('Cantidad de acciones')).toHaveDisplayValue('15');

    await type('Precio límite', '50'); // 1000 / 50 = 20: lo escrito se vuelve a recortar
    expect(screen.getByText('Máximo: 20 acciones')).toBeOnTheScreen();
    await type('Cantidad de acciones', '30');
    expect(input('Cantidad de acciones')).toHaveDisplayValue('20');
  });

  it('si cambiás el precio límite y lo ya escrito no entra, se recorta solo', async () => {
    await openBuy();
    await choose('Límite');
    await type('Precio límite', '10');
    await type('Cantidad de acciones', '80');

    await type('Precio límite', '50'); // ahora el máximo es 20

    expect(input('Cantidad de acciones')).toHaveDisplayValue('20');
  });

  it('al pasar de comprar a vender, lo escrito se recorta a lo que tenés', async () => {
    await openBuy();
    await type('Cantidad de acciones', '30'); // alcanza para comprar 30

    await choose('Vender'); // pero solo tenés 5

    expect(input('Cantidad de acciones')).toHaveDisplayValue('5');
  });

  it('si el efectivo no alcanza ni para una acción, el máximo es 0', async () => {
    withPortfolio({ ...portfolio, cash: 10 });
    await openBuy();

    await type('Cantidad de acciones', '3');

    expect(screen.getByText('Máximo: 0 acciones')).toBeOnTheScreen();
    expect(input('Cantidad de acciones')).toHaveDisplayValue('0');
  });
});
