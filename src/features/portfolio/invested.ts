import { Big } from 'big.js';

import type { HistoryOrder } from '@/features/orders/history/schema';

/** Efectivo con el que arranca una cuenta nueva en la API (el enunciado no lo fija: es lo observado). */
export const INITIAL_CAPITAL = new Big(1000000);

export interface InvestedPoint {
  date: Date;
  /** Capital que hay puesto en acciones después de este movimiento (compras menos ventas). */
  invested: Big;
}

/**
 * Cuánta plata hubo puesta en acciones después de cada orden ejecutada: las compras suman
 * cantidad x precio y las ventas restan. Se arma solo con las órdenes (la API no da precios
 * históricos, así que no se estima cuánto valía la cuenta en cada momento).
 *
 * Entran solo las ejecutadas (FILLED) que tienen precio y fecha. Se ordena siempre en la app,
 * porque la API no garantiza el orden de /orders (cambia según el modo de X-Enable-Bugs).
 */
export function investedSeries(orders: readonly HistoryOrder[]): InvestedPoint[] {
  const movements = orders
    .filter((o) => o.status === 'FILLED' && o.price !== null && o.createdAt !== null)
    .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime() || a.id - b.id);

  let total: Big | null = null;
  return movements.map((o) => {
    const amount = o.quantity.times(o.price!);
    const signed = o.side === 'BUY' ? amount : amount.times(-1);
    total = total ? total.plus(signed) : signed;
    return { date: o.createdAt!, invested: total };
  });
}
