import { Big } from 'big.js';

import { lineChart } from './chartGeometry';

const pts = (rows: [number, string][]) => rows.map(([time, v]) => ({ time, value: new Big(v) }));

describe('lineChart', () => {
  it('une los puntos con escalones y escala la altura a los valores que hay (autoescala)', () => {
    const { d, last } = lineChart(
      pts([
        [0, '100'],
        [10, '100'],
        [20, '110'],
      ]),
      100,
      50,
      10,
      10,
    );

    // x proporcional al tiempo; y: el máximo arriba y el mínimo abajo
    expect(d).toBe('M 10 40 H 50 V 40 H 90 V 10');
    expect(last).toEqual({ x: 90, y: 10 });
  });

  it('da 5 valores de referencia, del más alto al más bajo, repartidos parejo', () => {
    const { ticks } = lineChart(
      pts([
        [0, '100'],
        [20, '110'],
      ]),
      100,
      50,
      10,
      10,
    );

    expect(ticks.map((t) => [t.value.toString(), t.y])).toEqual([
      ['110', 10],
      ['107.5', 17.5],
      ['105', 25],
      ['102.5', 32.5],
      ['100', 40],
    ]);
  });

  it('el eje usa los valores exactos: una variación de centavos se ve, pero con sus números', () => {
    const { ticks } = lineChart(
      pts([
        [0, '1000000'],
        [10, '999997.32'],
        [20, '1000000'],
      ]),
      100,
      50,
      10,
      10,
    );

    expect(ticks[0].value.toString()).toBe('1000000');
    expect(ticks[4].value.toString()).toBe('999997.32');
  });

  it('si el valor nunca cambia la línea queda plana, en el medio, y no hay NaN', () => {
    const { d, ticks } = lineChart(
      pts([
        [0, '100'],
        [20, '100'],
      ]),
      100,
      50,
      10,
      10,
    );

    expect(d).toBe('M 10 25 H 90 V 25');
    expect(ticks[0].value.toString()).toBe('101');
    expect(ticks[4].value.toString()).toBe('99');
    expect(JSON.stringify({ d, ticks })).not.toMatch(/NaN|Infinity/);
  });

  it('si todos los puntos son del mismo instante no divide por cero', () => {
    const { d } = lineChart(
      pts([
        [5, '100'],
        [5, '110'],
      ]),
      100,
      50,
      10,
      10,
    );

    expect(d).not.toMatch(/NaN|Infinity/);
  });
});
