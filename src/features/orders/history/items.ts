import type { HistoryOrder } from './schema';

export interface HistoryItem extends HistoryOrder {
  /** null si el instrumento no está en la lista: no se inventa un nombre. */
  ticker: string | null;
}

/** Más nueva primero; sin fecha al final; con la misma fecha, la de id mayor primero. */
function newestFirst(a: HistoryItem, b: HistoryItem): number {
  const ta = a.createdAt?.getTime() ?? -Infinity;
  const tb = b.createdAt?.getTime() ?? -Infinity;
  return tb - ta || b.id - a.id;
}

/**
 * Arma las filas del historial: agrega el ticker y ordena siempre en la app, porque la API no
 * garantiza el orden (cambia según el modo de X-Enable-Bugs).
 */
export function toHistoryItems(
  orders: HistoryOrder[],
  instruments: { id: number; ticker: string }[],
): HistoryItem[] {
  const tickers = new Map(instruments.map((i) => [i.id, i.ticker]));
  return orders
    .map((o) => ({ ...o, ticker: tickers.get(o.instrumentId) ?? null }))
    .sort(newestFirst);
}
