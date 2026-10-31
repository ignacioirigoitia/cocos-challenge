import { Big } from 'big.js';

import { calcTotals } from './totals';

const b = (n: string) => new Big(n);

describe('calcTotals', () => {
  it('sin posiciones, el total es el efectivo', () => {
    const t = calcTotals(b('1000'), []);

    expect(t.positionsValue?.toString()).toBe('0');
    expect(t.totalValue?.toString()).toBe('1000');
  });

  it('suma efectivo y valor de mercado de las posiciones', () => {
    const t = calcTotals(b('999972.88'), [{ marketValue: b('27.12') }]);

    expect(t.positionsValue?.toString()).toBe('27.12');
    expect(t.totalValue?.toString()).toBe('1000000');
  });

  it('es exacto donde los floats fallan (0.1 + 0.2)', () => {
    const t = calcTotals(b('0.1'), [{ marketValue: b('0.2') }]);

    expect(t.totalValue?.toString()).toBe('0.3');
  });

  it('si alguna posición no tiene valor, el total queda sin dato (no una suma parcial)', () => {
    const t = calcTotals(b('1000'), [{ marketValue: b('27.12') }, { marketValue: null }]);

    expect(t.positionsValue).toBeNull();
    expect(t.totalValue).toBeNull();
  });
});
