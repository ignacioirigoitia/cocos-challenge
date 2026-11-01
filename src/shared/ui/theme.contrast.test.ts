import { contrastRatio } from './contrast';
import { palettes } from './theme';

// WCAG 2.1 AA: 4,5 a 1 para texto normal y 3 a 1 para el borde de un componente de entrada.
const TEXT_MIN = 4.5;
const BOUNDARY_MIN = 3;

// Solo las combinaciones que la app realmente usa (no todas las posibles).
const TEXT_PAIRS = [
  ['text', 'background', 'texto principal'],
  ['text', 'surface', 'texto escrito en el buscador'],
  ['textSecondary', 'background', 'textos secundarios'],
  ['textSecondary', 'surface', 'placeholder del buscador y opciones sin elegir'],
  ['positive', 'background', 'ganancias y "Compra"'],
  ['negative', 'background', 'pérdidas, "Venta" y errores'],
  ['background', 'positive', 'etiqueta de "Comprar" elegido'],
  ['background', 'negative', 'etiqueta de "Vender" elegido'],
  ['background', 'text', 'botón principal y opciones elegidas'],
] as const;

describe.each(['light', 'dark'] as const)('paleta %s', (scheme) => {
  const colors = palettes[scheme];

  it.each(TEXT_PAIRS)('%s sobre %s (%s) llega a AA', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it('la línea de los campos de texto se distingue del fondo (3 a 1)', () => {
    expect(contrastRatio(colors.inputBorder, colors.background)).toBeGreaterThanOrEqual(
      BOUNDARY_MIN,
    );
  });
});
