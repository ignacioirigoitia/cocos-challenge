import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Big } from 'big.js';

import { createQueryClient } from '@/shared/api/queryClient';
import { useSettings } from '@/shared/store/settings';

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

afterEach(() => client.clear());

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

  it('no deja comprar más de lo que alcanza el efectivo', async () => {
    await renderScreen();
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '100');

    await press('Revisar orden');

    expect(
      await screen.findByText(
        'No tenés efectivo suficiente. Necesitás $ 2.712,00 y tenés $ 1.000,00.',
      ),
    ).toBeOnTheScreen();
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

  it('no deja vender más acciones de las que tenés', async () => {
    await renderScreen({ ...params, side: 'SELL' });
    await screen.findByText('Efectivo disponible');
    await type('Cantidad de acciones', '6');

    await press('Revisar orden');

    expect(await screen.findByText('No tenés suficientes acciones. Tenés 5.')).toBeOnTheScreen();
  });

  it('sin precio no se puede operar', async () => {
    await renderScreen({ ...params, lastPrice: null });

    expect(
      await screen.findByText('Este instrumento no tiene precio disponible.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Revisar orden' })).not.toBeOnTheScreen();

    await press('Cerrar');
    expect(onClose).toHaveBeenCalled();
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

    expect(await screen.findByText('Estado desconocido')).toBeOnTheScreen();
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
