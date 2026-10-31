import { InstrumentsResponseSchema } from './schema';

const dyca = {
  id: 1,
  ticker: 'DYCA',
  name: 'Dycasa S.A.',
  type: 'ACCIONES',
  last_price: 45.72,
  close_price: 50.07,
};
const mirgConBug = {
  ...dyca,
  id: 5,
  ticker: 'MIRG',
  name: 'Mirgor',
  last_price: 0,
  close_price: 37.74,
};
const ars = { id: 26, ticker: 'ARS', name: 'Pesos', type: 'MONEDA', last_price: 1, close_price: 1 };

describe('InstrumentsResponseSchema', () => {
  it('convierte los precios a Big y calcula el retorno', () => {
    const [i] = InstrumentsResponseSchema.parse([dyca]);

    expect(i.ticker).toBe('DYCA');
    expect(i.lastPrice?.toString()).toBe('45.72');
    expect(i.closePrice?.toString()).toBe('50.07');
    expect(i.returnPct?.round(2).toString()).toBe('-8.69');
    expect(i.tradable).toBe(true);
  });

  it('last_price en 0 (defecto de la API): sin precio, sin retorno y no operable', () => {
    const [i] = InstrumentsResponseSchema.parse([mirgConBug]);

    expect(i.lastPrice).toBeNull();
    expect(i.returnPct).toBeNull();
    expect(i.tradable).toBe(false);
  });

  it('ARS es un instrumento más: operable, con retorno 0', () => {
    const [i] = InstrumentsResponseSchema.parse([ars]);

    expect(i.type).toBe('MONEDA');
    expect(i.tradable).toBe(true);
    expect(i.returnPct?.toString()).toBe('0');
  });

  it.each([null, 'abc', -5, undefined])('precio inválido (%p) se trata como sin dato', (price) => {
    const [i] = InstrumentsResponseSchema.parse([{ ...dyca, last_price: price }]);

    expect(i.lastPrice).toBeNull();
    expect(i.tradable).toBe(false);
  });

  it('rechaza la respuesta si falta un campo estructural (ticker)', () => {
    const { ticker: _ticker, ...sinTicker } = dyca;

    expect(InstrumentsResponseSchema.safeParse([sinTicker]).success).toBe(false);
  });

  it('rechaza una respuesta que no es una lista', () => {
    expect(InstrumentsResponseSchema.safeParse({ error: 'x' }).success).toBe(false);
  });
});
