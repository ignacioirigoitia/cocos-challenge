/**
 * Ordena por ticker, alfabéticamente y sin distinguir mayúsculas. Devuelve una lista nueva (no
 * modifica la original) y es estable: con el mismo ticker se mantiene el orden de entrada.
 * Se compara por texto, así que "TECO10" va antes que "TECO2"; los tickers reales son cortos.
 */
export function sortByTicker<T extends { ticker: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const x = a.ticker.toUpperCase();
    const y = b.ticker.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
