import { pieSlices } from './pieGeometry';

describe('pieSlices', () => {
  it('reparte la torta en sentido horario empezando arriba', () => {
    const slices = pieSlices([0.25, 0.75], 50, 50, 40);

    expect(slices).toEqual([
      { d: 'M 50 50 L 50 10 A 40 40 0 0 1 90 50 Z' },
      { d: 'M 50 50 L 90 50 A 40 40 0 1 1 50 10 Z' },
    ]);
  });

  it('una mitad exacta no usa el arco grande', () => {
    const [a, b] = pieSlices([0.5, 0.5], 50, 50, 40) as { d: string }[];

    expect(a.d).toBe('M 50 50 L 50 10 A 40 40 0 0 1 50 90 Z');
    expect(b.d).toBe('M 50 50 L 50 90 A 40 40 0 0 1 50 10 Z');
  });

  it('una sola porción de 100% es un círculo entero (un arco no puede cerrarse sobre sí mismo)', () => {
    expect(pieSlices([1], 50, 50, 40)).toEqual([{ circle: true }]);
  });

  it('una porción minúscula no rompe nada: no hay NaN en ningún camino', () => {
    const slices = pieSlices([0.0005, 0.9995], 50, 50, 40);

    expect(JSON.stringify(slices)).not.toMatch(/NaN|Infinity/);
    expect(slices).toHaveLength(2);
  });
});
