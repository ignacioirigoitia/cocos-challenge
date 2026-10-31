import { Big } from 'big.js';

import {
  calcPosition,
  calcReturnPct,
  formatARS,
  formatPct,
  parseAmount,
  parsePrice,
} from './money';

describe('parseAmount', () => {
  it('acepta un monto con decimales', () => {
    expect(parseAmount(999972.88)?.toString()).toBe('999972.88');
  });

  it('acepta el 0: un efectivo en 0 es un valor válido', () => {
    expect(parseAmount(0)?.toString()).toBe('0');
  });

  it.each([-1, NaN, Infinity, null, undefined, '', 'abc', {}])(
    'devuelve null para un valor inválido o negativo: %p',
    (value) => {
      expect(parseAmount(value)).toBeNull();
    },
  );

  it('parsePrice sigue rechazando el 0 (un precio en 0 es un dato roto)', () => {
    expect(parsePrice(0)).toBeNull();
  });
});

describe('calcPosition', () => {
  const q = (n: string) => new Big(n);

  it('calcula valor de mercado, ganancia y rendimiento con ganancia', () => {
    const p = calcPosition(q('10'), q('27.12'), q('25'));

    expect(p.marketValue?.toString()).toBe('271.2');
    expect(p.gain?.toString()).toBe('21.2');
    expect(p.returnPct?.round(2).toString()).toBe('8.48');
  });

  it('calcula una pérdida con valores negativos', () => {
    const p = calcPosition(q('10'), q('27.12'), q('30'));

    expect(p.gain?.toString()).toBe('-28.8');
    expect(p.returnPct?.round(2).toString()).toBe('-9.6');
  });

  it('es exacto donde los floats fallan (3 x 0.1 contra 0.2 de costo)', () => {
    const p = calcPosition(q('3'), q('0.1'), q('0.2'));

    expect(p.marketValue?.toString()).toBe('0.3');
    expect(p.gain?.toString()).toBe('-0.3');
    expect(p.returnPct?.toString()).toBe('-50');
  });

  it('sin último precio: todo queda sin dato, no en 0', () => {
    const p = calcPosition(q('10'), null, q('25'));

    expect(p.marketValue).toBeNull();
    expect(p.gain).toBeNull();
    expect(p.returnPct).toBeNull();
  });

  it('sin costo promedio válido: hay valor de mercado pero no ganancia ni rendimiento', () => {
    const p = calcPosition(q('10'), q('27.12'), null);

    expect(p.marketValue?.toString()).toBe('271.2');
    expect(p.gain).toBeNull();
    expect(p.returnPct).toBeNull();
  });
});

describe('parsePrice', () => {
  it('convierte un número de la API a Big sin perder los decimales', () => {
    expect(parsePrice(45.72)?.toString()).toBe('45.72');
  });

  it('acepta un string numérico', () => {
    expect(parsePrice('84.5')?.toString()).toBe('84.5');
  });

  it.each([0, -1, NaN, Infinity, null, undefined, '', 'abc', {}, [], true])(
    'devuelve null para un valor inválido o sin precio: %p',
    (value) => {
      expect(parsePrice(value)).toBeNull();
    },
  );
});

describe('formatARS', () => {
  it('usa coma decimal y punto de miles', () => {
    expect(formatARS(new Big('1234567.5'))).toBe('$ 1.234.567,50');
  });

  it('redondea a 2 decimales', () => {
    expect(formatARS(new Big('45.725'))).toBe('$ 45,73');
  });

  it('pone el signo menos adelante en montos negativos', () => {
    expect(formatARS(new Big('-1234.5'))).toBe('-$ 1.234,50');
  });

  it('muestra "--" si no hay dato', () => {
    expect(formatARS(null)).toBe('--');
  });
});

describe('formatPct', () => {
  it('agrega + a los positivos', () => {
    expect(formatPct(new Big('7.9863'))).toBe('+7,99%');
  });

  it('mantiene el - de los negativos', () => {
    expect(formatPct(new Big('-8.6878'))).toBe('-8,69%');
  });

  it('muestra 0 sin signo', () => {
    expect(formatPct(new Big('0'))).toBe('0,00%');
  });

  it('no muestra "-0,00%" cuando un negativo redondea a cero', () => {
    expect(formatPct(new Big('-0.001'))).toBe('0,00%');
  });

  it('muestra "--" si no hay dato', () => {
    expect(formatPct(null)).toBe('--');
  });
});

describe('calcReturnPct', () => {
  it('calcula el retorno positivo en % entre último precio y cierre (CAPX)', () => {
    const result = calcReturnPct(new Big('53.68'), new Big('49.71'));
    expect(result?.round(2).toString()).toBe('7.99');
  });

  it('calcula el retorno negativo (DYCA)', () => {
    const result = calcReturnPct(new Big('45.72'), new Big('50.07'));
    expect(result?.round(2).toString()).toBe('-8.69');
  });

  it('devuelve 0 cuando el precio no cambió (ARS)', () => {
    const result = calcReturnPct(new Big('1'), new Big('1'));
    expect(result?.toString()).toBe('0');
  });

  it('devuelve null si falta el último precio (sin dato)', () => {
    expect(calcReturnPct(null, new Big('37.74'))).toBeNull();
  });

  it('devuelve null si el cierre es 0 (no se puede dividir)', () => {
    expect(calcReturnPct(new Big('10'), new Big('0'))).toBeNull();
  });
});
