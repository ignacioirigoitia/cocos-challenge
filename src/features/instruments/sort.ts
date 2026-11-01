import { sortByTicker } from '@/shared/sort/byTicker';

import type { Instrument } from './schema';

export type SortMode = 'alphabetical' | 'gainers' | 'losers';

/**
 * Orden de la lista de Mercado.
 * - alphabetical: todos, por ticker.
 * - gainers: solo los que subieron en el día, de la mayor suba a la menor.
 * - losers: solo los que bajaron, de la mayor baja a la menor.
 * Sin precio válido (retorno null) o sin variación (0) no entran en los rankings. Con el mismo
 * retorno desempata el ticker. Devuelve una lista nueva.
 *
 * Ojo con el nombre: es la variación del día (último precio contra cierre), no la volatilidad en
 * sentido estricto, que necesitaría un historial de precios que la API no da.
 */
export function sortInstruments(items: readonly Instrument[], mode: SortMode): Instrument[] {
  if (mode === 'alphabetical') return sortByTicker(items);

  const direction = mode === 'gainers' ? 1 : -1;
  return sortByTicker(items)
    .filter((i) => i.returnPct !== null && i.returnPct.times(direction).gt(0))
    .sort((a, b) => b.returnPct!.minus(a.returnPct!).times(direction).toNumber());
}
