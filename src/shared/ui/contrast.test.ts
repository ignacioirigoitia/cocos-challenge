import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('negro sobre blanco es el máximo: 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('un color sobre sí mismo es el mínimo: 1', () => {
    expect(contrastRatio('#6B7280', '#6B7280')).toBeCloseTo(1, 5);
  });

  it('el gris #767676 sobre blanco es el valor de referencia de WCAG: 4,54', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('no depende del orden de los colores', () => {
    expect(contrastRatio('#00875A', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#00875A'),
      10,
    );
  });

  it('acepta minúsculas', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it.each(['rojo', '#FFF', '#GGGGGG', '', '#12345'])('rechaza un color inválido (%p)', (color) => {
    expect(() => contrastRatio(color, '#FFFFFF')).toThrow();
  });
});
