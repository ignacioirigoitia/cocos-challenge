import { stepPath } from './chartGeometry';

describe('stepPath', () => {
  it('une los valores con escalones: primero horizontal, después vertical', () => {
    const { d, zeroY, last } = stepPath([0, 10, 4], 100, 50, 10);

    // x reparte el ancho útil en partes iguales; y: el máximo arriba y el 0 abajo.
    expect(d).toBe('M 10 40 H 50 V 10 H 90 V 28');
    expect(zeroY).toBe(40);
    expect(last).toEqual({ x: 90, y: 28 });
  });

  it('con valores negativos el 0 queda arriba y el mínimo abajo', () => {
    const { d, zeroY } = stepPath([0, -10], 100, 50, 10);

    expect(d).toBe('M 10 10 H 90 V 40');
    expect(zeroY).toBe(10);
  });

  it('si todo vale 0 no divide por cero: queda una línea plana', () => {
    const { d } = stepPath([0, 0], 100, 50, 10);

    expect(d).toBe('M 10 40 H 90 V 40');
    expect(d).not.toMatch(/NaN|Infinity/);
  });
});
