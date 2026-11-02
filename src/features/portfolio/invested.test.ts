import { OrdersResponseSchema } from '@/features/orders/history/schema';

import { investedSeries } from './invested';

const order = (over: Record<string, unknown>) => ({
  id: 1,
  instrument_id: 16,
  side: 'BUY',
  type: 'MARKET',
  quantity: 1,
  price: 10,
  status: 'FILLED',
  created_at: '2026-10-31T10:00:00',
  ...over,
});
const series = (orders: unknown[]) => investedSeries(OrdersResponseSchema.parse(orders));
const values = (orders: unknown[]) => series(orders).map((p) => p.invested.toString());

describe('investedSeries', () => {
  it('sin órdenes no hay movimientos', () => {
    expect(series([])).toEqual([]);
  });

  it('cada compra suma cantidad x precio y cada venta resta', () => {
    expect(
      values([
        order({ id: 1, quantity: 10, price: 53.68 }),
        order({ id: 2, side: 'SELL', quantity: 4, price: 60, created_at: '2026-10-31T11:00:00' }),
      ]),
    ).toEqual(['536.8', '296.8']);
  });

  it('ordena por fecha en la app, venga como venga de la API', () => {
    const viejo = order({ id: 1, created_at: '2026-10-31T10:00:00' });
    const nuevo = order({ id: 2, side: 'SELL', price: 4, created_at: '2026-11-01T10:00:00' });

    expect(values([nuevo, viejo])).toEqual(['10', '6']);
  });

  it('con la misma fecha desempata por id', () => {
    const a = order({ id: 1, created_at: '2026-10-31T10:00:00' });
    const b = order({ id: 2, side: 'SELL', price: 4, created_at: '2026-10-31T10:00:00' });

    expect(values([b, a])).toEqual(['10', '6']);
  });

  it('solo cuentan las órdenes ejecutadas: ni rechazadas ni pendientes ni de estado raro', () => {
    expect(
      values([
        order({ id: 1 }),
        order({ id: 2, status: 'REJECTED', type: 'LIMIT' }),
        order({ id: 3, status: 'PENDING', type: 'LIMIT' }),
        order({ id: 4, status: 'QUIEN_SABE' }),
      ]),
    ).toEqual(['10']);
  });

  it('una orden sin precio o sin fecha no se puede ubicar en el gráfico: se deja afuera', () => {
    expect(
      values([
        order({ id: 1 }),
        order({ id: 2, price: 0 }),
        order({ id: 3, created_at: undefined }),
      ]),
    ).toEqual(['10']);
  });

  it('guarda la fecha de cada movimiento', () => {
    const [p] = series([order({ created_at: '2026-10-31T10:00:00' })]);

    expect(p.date).toEqual(new Date('2026-10-31T10:00:00'));
  });

  it('si se vendió más caro de lo que se compró, el neto puede quedar en negativo', () => {
    expect(
      values([
        order({ id: 1 }),
        order({ id: 2, side: 'SELL', price: 25, created_at: '2026-11-01T10:00:00' }),
      ]),
    ).toEqual(['10', '-15']);
  });
});
