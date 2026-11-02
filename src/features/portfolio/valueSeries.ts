import { Big } from 'big.js';

import type { HistoryOrder } from '@/features/orders/history/schema';

/** Efectivo con el que arranca una cuenta nueva en la API (el enunciado no lo fija: es lo observado). */
export const INITIAL_CAPITAL = new Big(1000000);

export interface ValuePoint {
  date: Date;
  value: Big;
}

/**
 * Cuánto valía la cuenta después de cada orden, ESTIMADO: la API no da precios históricos, así que
 * cada instrumento se valúa con el último precio al que se ejecutó una orden suya.
 *
 * Arranca en el capital inicial (en la fecha de la primera orden) y termina en el total real de
 * hoy (si se conoce: si falta algún precio no se inventa el último punto). Entran solo las órdenes
 * ejecutadas (FILLED) con precio y fecha, ordenadas en la app porque la API no garantiza el orden.
 * Sin órdenes utilizables no hay serie.
 */
export function valueSeries(
  orders: readonly HistoryOrder[],
  initialCapital: Big,
  currentTotal: Big | null,
  now: Date,
): ValuePoint[] {
  const movements = orders
    .filter((o) => o.status === 'FILLED' && o.price !== null && o.createdAt !== null)
    .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime() || a.id - b.id);
  if (movements.length === 0) return [];

  let cash = initialCapital;
  const held = new Map<number, { quantity: Big; price: Big }>();
  const points: ValuePoint[] = [{ date: movements[0].createdAt!, value: initialCapital }];

  for (const o of movements) {
    const amount = o.quantity.times(o.price!);
    const sign = o.side === 'BUY' ? 1 : -1;
    cash = cash.minus(amount.times(sign));
    const previous = held.get(o.instrumentId)?.quantity ?? new Big(0);
    held.set(o.instrumentId, { quantity: previous.plus(o.quantity.times(sign)), price: o.price! });

    let value = cash;
    for (const { quantity, price } of held.values()) value = value.plus(quantity.times(price));
    points.push({ date: o.createdAt!, value });
  }

  if (currentTotal) points.push({ date: now, value: currentTotal });
  return points;
}
