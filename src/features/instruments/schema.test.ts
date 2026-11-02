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

  it('deja afuera las monedas (ARS): los pesos son el efectivo de la cuenta, no algo que se opere', () => {
    const list = InstrumentsResponseSchema.parse([dyca, ars, mirgConBug]);

    expect(list.map((i) => i.ticker)).toEqual(['DYCA', 'MIRG']);
  });

  it('solo saca lo que se sabe que no se opera (MONEDA): un tipo nuevo no se esconde', () => {
    const [i] = InstrumentsResponseSchema.parse([{ ...dyca, type: 'BONOS' }]);

    expect(i.type).toBe('BONOS');
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
