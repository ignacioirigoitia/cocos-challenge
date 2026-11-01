import hardOrders from '../__fixtures__/orders.hard.json';
import offOrders from '../__fixtures__/orders.off.json';
import { OrdersResponseSchema } from './schema';

const base = offOrders[0];

describe('OrdersResponseSchema', () => {
  it('parsea la respuesta real de /orders con off', () => {
    const orders = OrdersResponseSchema.parse(offOrders);

    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({ id: 147106, instrumentId: 16, side: 'BUY', type: 'MARKET' });
    expect(orders[0].quantity.toString()).toBe('1');
    expect(orders[0].price?.toString()).toBe('27.12');
    expect(orders[0].status).toBe('FILLED');
    expect(orders[0].createdAt).toBeInstanceOf(Date);
  });

  it('parsea también la respuesta real de hard, que viene desordenada', () => {
    const ids = OrdersResponseSchema.parse(hardOrders).map((o) => o.id);

    expect(ids).toEqual([224926, 147106]);
  });

  it('una orden límite ejecutada es válida en el historial (se resolvió con el tiempo)', () => {
    const [order] = OrdersResponseSchema.parse([
      { ...base, type: 'LIMIT', status: 'FILLED', price: 10 },
    ]);

    expect(order.status).toBe('FILLED');
  });

  it('una orden a mercado en espera no corresponde: queda como estado inesperado', () => {
    const [order] = OrdersResponseSchema.parse([{ ...base, status: 'PENDING' }]);

    expect(order.status).toBe('UNKNOWN');
  });

  it('un estado que no conoce queda como UNKNOWN', () => {
    const [order] = OrdersResponseSchema.parse([{ ...base, status: 'CANCELLED' }]);

    expect(order.status).toBe('UNKNOWN');
  });

  it.each([0, null, undefined, 'abc'])('un precio inválido (%p) queda como null', (price) => {
    const [order] = OrdersResponseSchema.parse([{ ...base, price }]);

    expect(order.price).toBeNull();
  });

  it.each([undefined, null, 'no es una fecha', ''])(
    'una fecha ausente o inválida (%p) queda como null en vez de romper la lista',
    (created_at) => {
      const [order] = OrdersResponseSchema.parse([{ ...base, created_at }]);

      expect(order.createdAt).toBeNull();
    },
  );

  it.each([
    ['sin id', { ...base, id: undefined }],
    ['sin instrument_id', { ...base, instrument_id: undefined }],
    ['con un side desconocido', { ...base, side: 'HOLD' }],
    ['con cantidad decimal', { ...base, quantity: 1.5 }],
  ])('rechaza toda la respuesta si una orden viene %s', (_name, order) => {
    expect(OrdersResponseSchema.safeParse([base, order]).success).toBe(false);
  });

  it('rechaza una respuesta que no es una lista', () => {
    expect(OrdersResponseSchema.safeParse({ error: 'x' }).success).toBe(false);
  });
});
