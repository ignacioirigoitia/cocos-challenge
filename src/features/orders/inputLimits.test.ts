import { Big } from 'big.js';

import { clampToMax } from './inputLimits';

const b = (n: string) => new Big(n);

describe('clampToMax', () => {
  it.each([
    ['3', '5', '3'],
    ['5', '5', '5'], // justo el máximo
    ['05', '5', '05'], // un cero a la izquierda no es un exceso
  ])('si %p no supera el máximo %p, queda igual', (text, max, expected) => {
    expect(clampToMax(text, b(max), 0)).toBe(expected);
  });

  it.each([
    ['6', '5', '5'],
    ['9', '5', '5'],
    ['99999999999', '5', '5'],
  ])('si %p supera el máximo %p, queda en el máximo', (text, max, expected) => {
    expect(clampToMax(text, b(max), 0)).toBe(expected);
  });

  it.each(['', ' ', ',', '1,', 'abc', '-3'])(
    'lo que todavía no es un número (%p) se deja como está: lo valida el formulario',
    (text) => {
      expect(clampToMax(text, b('5'), 0)).toBe(text);
    },
  );

  it('con decimales, recorta al máximo con la coma argentina', () => {
    expect(clampToMax('100,5', b('27.12'), 2)).toBe('27,12');
  });

  it('muestra siempre 2 decimales en un monto', () => {
    expect(clampToMax('9999', b('135.6'), 2)).toBe('135,60');
  });

  it('el máximo con más de 2 decimales se redondea hacia abajo (nunca permite de más)', () => {
    expect(clampToMax('9999', b('135.679'), 2)).toBe('135,67');
  });

  it('con máximo 0, cualquier cantidad positiva queda en 0', () => {
    expect(clampToMax('1', b('0'), 0)).toBe('0');
  });
});
