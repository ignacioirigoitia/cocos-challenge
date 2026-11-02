import type { Big } from 'big.js';

export const TICK_COUNT = 5;

/**
 * Coordenadas del gráfico de línea del valor de la cuenta.
 * - x es proporcional al tiempo.
 * - y se escala (autoescala) del valor más bajo al más alto; si nunca cambia, se abre ±1 para que
 *   la línea quede plana en el medio y no se divida por cero.
 * - La línea va en escalones: entre dos órdenes el valor estimado no cambia.
 * - ticks: 5 valores de referencia, del más alto al más bajo, repartidos parejo. Se calculan con
 *   Big (son pesos); solo las coordenadas pasan a número.
 */
export function lineChart(
  points: { time: number; value: Big }[],
  width: number,
  height: number,
  padX = 8,
  padY = 12,
) {
  let lo = points.reduce((m, p) => (p.value.lt(m) ? p.value : m), points[0].value);
  let hi = points.reduce((m, p) => (p.value.gt(m) ? p.value : m), points[0].value);
  if (lo.eq(hi)) {
    lo = lo.minus(1);
    hi = hi.plus(1);
  }
  const span = hi.minus(lo);

  const t0 = points[0].time;
  const timeSpan = points[points.length - 1].time - t0 || 1;
  const x = (time: number) => padX + ((time - t0) / timeSpan) * (width - 2 * padX);
  const y = (value: Big) => padY + hi.minus(value).div(span).toNumber() * (height - 2 * padY);

  let d = `M ${x(points[0].time)} ${y(points[0].value)}`;
  for (const p of points.slice(1)) d += ` H ${x(p.time)} V ${y(p.value)}`;

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const value = hi.minus(span.times(i).div(TICK_COUNT - 1));
    return { value, y: y(value) };
  });

  const end = points[points.length - 1];
  return { d, ticks, last: { x: x(end.time), y: y(end.value) } };
}
