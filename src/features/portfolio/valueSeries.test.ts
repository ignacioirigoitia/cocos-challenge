import { Big } from 'big.js';

import { OrdersResponseSchema } from '@/features/orders/history/schema';

import { INITIAL_CAPITAL, valueSeries } from './valueSeries';

const order = (over: Record<string, unknown>) => ({
  id: 1,
  instrument_id: 16,
  side: 'BUY',
  type: 'MARKET',
  quantity: 1,
  price: 27.12,
  status: 'FILLED',
  created_at: '2026-10-31T10:00:00',
  ...over,
});
const NOW = new Date('2026-11-02T12:00:00');
const run = (orders: unknown[], total: Big | null = new Big('1000000')) =>
  valueSeries(OrdersResponseSchema.parse(orders), INITIAL_CAPITAL, total, NOW);
const values = (orders: unknown[], total?: Big | null) =>
  run(orders, total).map((p) => p.value.toString());

describe('valueSeries', () => {
  it('el capital inicial de una cuenta nueva es 1.000.000', () => {
    expect(INITIAL_CAPITAL.toString()).toBe('1000000');
  });

  it('sin órdenes no hay serie', () => {
    expect(run([])).toEqual([]);
  });

  it('comprar al precio de mercado no cambia el valor: el efectivo se vuelve acciones', () => {
    // arranca en el inicial, después de la compra sigue igual y termina en el total de hoy
    expect(values([order({})])).toEqual(['1000000', '1000000', '1000000']);
  });

  it('el último punto es el total real de hoy y lleva la fecha de ahora', () => {
    const points = run([order({})], new Big('1000050'));

    expect(points[points.length - 1].value.toString()).toBe('1000050');
    expect(points[points.length - 1].date).toEqual(NOW);
  });

  it('si no hay total (falta algún precio) no se inventa el último punto', () => {
    expect(values([order({})], null)).toEqual(['1000000', '1000000']);
  });

  it('el primer punto es el capital inicial, en la fecha de la primera orden', () => {
    const [first] = run([order({ created_at: '2026-10-31T10:00:00' })]);

    expect(first.value.toString()).toBe('1000000');
    expect(first.date).toEqual(new Date('2026-10-31T10:00:00'));
  });

  it('comprar a un precio distinto del que ya tenía marca la diferencia (defecto de hard: 24,44 en vez de 27,12)', () => {
    const v = values([
      order({ id: 1, price: 27.12, created_at: '2026-10-31T10:00:00' }),
      order({ id: 2, price: 24.44, created_at: '2026-11-01T10:00:00' }),
    ]);

    // cash 1.000.000 - 27,12 - 24,44; 2 acciones valuadas a 24,44 = 48,88
    expect(v[2]).toBe('999997.32');
  });

  it('vender suma el efectivo y descuenta las acciones', () => {
    const v = values([
      order({ id: 1, quantity: 10, price: 50 }),
      order({ id: 2, side: 'SELL', quantity: 4, price: 60, created_at: '2026-11-01T10:00:00' }),
    ]);

    // cash 1.000.000 - 500 + 240; 6 acciones a 60 = 360
    expect(v[2]).toBe('1000100');
  });

  it('las acciones que quedan después de vender se valúan con el precio de la última operación', () => {
    const v = values([
      order({ id: 1, quantity: 10, price: 50 }),
      order({ id: 2, side: 'SELL', quantity: 4, price: 60, created_at: '2026-11-01T10:00:00' }),
      order({ id: 3, quantity: 1, price: 70, created_at: '2026-11-02T10:00:00' }),
    ]);

    // quedan 6 + 1 = 7 acciones a 70 = 490; efectivo 1.000.000 - 500 + 240 - 70
    expect(v[3]).toBe('1000160');
  });

  it('cada instrumento se valúa con su propio último precio de ejecución', () => {
    const v = values([
      order({ id: 1, instrument_id: 2, quantity: 10, price: 50 }),
      order({
        id: 2,
        instrument_id: 16,
        quantity: 1,
        price: 10,
        created_at: '2026-11-01T10:00:00',
      }),
    ]);

    // 500 en CAPX y 10 en GARO, cada uno a lo que se pagó: el valor no cambia
    expect(v[2]).toBe('1000000');
  });

  it('ordena por fecha en la app, venga como venga de la API', () => {
    const viejo = order({ id: 1, price: 10, created_at: '2026-10-31T10:00:00' });
    const nuevo = order({ id: 2, price: 20, created_at: '2026-11-01T10:00:00' });

    expect(run([nuevo, viejo]).map((p) => p.date.getTime())).toEqual([
      ...run([viejo, nuevo]).map((p) => p.date.getTime()),
    ]);
  });

  it('solo cuentan las ejecutadas con precio y fecha', () => {
    const v = values([
      order({ id: 1 }),
      order({ id: 2, status: 'REJECTED', type: 'LIMIT' }),
      order({ id: 3, status: 'PENDING', type: 'LIMIT' }),
      order({ id: 4, price: 0 }),
      order({ id: 5, created_at: undefined }),
    ]);

    expect(v).toEqual(['1000000', '1000000', '1000000']);
  });

  it('si no queda ninguna orden utilizable no hay serie', () => {
    expect(run([order({ status: 'REJECTED', type: 'LIMIT' })])).toEqual([]);
  });
});
