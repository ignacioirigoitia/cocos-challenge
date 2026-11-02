import { Big } from 'big.js';

import { calcComposition } from './composition';

const holding = (instrumentId: number, ticker: string, marketValue: string | null) => ({
  instrumentId,
  ticker,
  marketValue: marketValue ? new Big(marketValue) : null,
});

describe('calcComposition', () => {
  it('reparte el total entre cada posición y el efectivo (el efectivo va último)', () => {
    const c = calcComposition(new Big('600'), [
      holding(1, 'CAPX', '300'),
      holding(2, 'GARO', '100'),
    ]);

    expect(c?.map((s) => [s.label, s.value.toString(), s.pct.toString()])).toEqual([
      ['CAPX', '300', '30'],
      ['GARO', '100', '10'],
      ['Efectivo disponible', '600', '60'],
    ]);
  });

  it('los porcentajes suman 100', () => {
    const c = calcComposition(new Big('998869.68'), [
      holding(1, 'BPAT', '566.40'),
      holding(2, 'CAPX', '536.80'),
      holding(3, 'GARO', '27.12'),
    ]);

    const sum = c!.reduce((acc, s) => acc.plus(s.pct), new Big(0));
    expect(sum.round(10).toString()).toBe('100');
  });

  it('solo efectivo: una sola porción de 100%', () => {
    const c = calcComposition(new Big('1000'), []);

    expect(c).toHaveLength(1);
    expect(c![0].pct.toString()).toBe('100');
  });

  it('una posición con valor 0 no aporta una porción', () => {
    const c = calcComposition(new Big('100'), [holding(1, 'CAPX', '0')]);

    expect(c?.map((s) => s.label)).toEqual(['Efectivo disponible']);
  });

  it('si a alguna posición le falta el precio no se puede armar: null y no una torta incompleta', () => {
    expect(calcComposition(new Big('100'), [holding(1, 'CAPX', null)])).toBeNull();
  });

  it('sin nada de plata (total 0) no hay qué repartir: null', () => {
    expect(calcComposition(new Big('0'), [])).toBeNull();
  });

  it('cada porción tiene una clave única para listas', () => {
    const c = calcComposition(new Big('1'), [holding(1, 'A', '1'), holding(2, 'B', '1')]);

    expect(new Set(c!.map((s) => s.key)).size).toBe(3);
  });
});
