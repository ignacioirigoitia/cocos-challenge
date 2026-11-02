export type PieSlice = { d: string } | { circle: true };

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Caminos SVG de una torta: una porción por fracción (las fracciones suman 1), en sentido horario
 * y empezando arriba. Una sola porción de 100% no se puede dibujar con un arco (empieza y termina
 * en el mismo punto), así que se pide un círculo entero.
 */
export function pieSlices(fractions: number[], cx: number, cy: number, r: number): PieSlice[] {
  if (fractions.length === 1) return [{ circle: true }];

  const point = (angle: number) =>
    `${round(cx + r * Math.cos(angle))} ${round(cy + r * Math.sin(angle))}`;
  let start = -Math.PI / 2; // arriba
  return fractions.map((f) => {
    const span = f * 2 * Math.PI;
    const end = start + span;
    const large = span > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${point(start)} A ${r} ${r} 0 ${large} 1 ${point(end)} Z`;
    start = end;
    return { d };
  });
}
