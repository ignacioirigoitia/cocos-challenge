/**
 * Coordenadas de un gráfico de escalones para los valores dados. Los valores se pasan a número
 * solo para dibujar: acá no se calcula ninguna cuenta de dinero.
 * - x reparte el ancho útil en partes iguales (cada valor es un movimiento, no un día).
 * - y va de abajo hacia arriba; el eje siempre incluye el 0.
 */
export function stepPath(values: number[], width: number, height: number, pad = 8) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1; // todo en 0: evita dividir por cero
  const x = (i: number) => pad + (i * (width - 2 * pad)) / Math.max(values.length - 1, 1);
  const y = (v: number) => height - pad - ((v - lo) / span) * (height - 2 * pad);

  let d = `M ${x(0)} ${y(values[0])}`;
  for (let i = 1; i < values.length; i++) d += ` H ${x(i)} V ${y(values[i])}`;

  const end = values.length - 1;
  return { d, zeroY: y(0), last: { x: x(end), y: y(values[end]) } };
}
