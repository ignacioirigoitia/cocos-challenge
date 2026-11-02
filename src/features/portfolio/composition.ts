import { Big } from 'big.js';

export interface Slice {
  key: string;
  label: string;
  value: Big;
  /** Porcentaje del total de la cartera (0 a 100). */
  pct: Big;
}

/**
 * De qué está compuesta la cartera: el valor de cada posición y el efectivo disponible, con su
 * porcentaje sobre el total. El efectivo va al final. Las posiciones sin valor no aportan porción.
 * null si a alguna posición le falta el precio (no se muestra una composición incompleta) o si no
 * hay nada que repartir.
 */
export function calcComposition(
  cash: Big,
  holdings: { instrumentId: number; ticker: string; marketValue: Big | null }[],
): Slice[] | null {
  const parts: Omit<Slice, 'pct'>[] = [];
  for (const h of holdings) {
    if (!h.marketValue) return null;
    if (h.marketValue.gt(0)) {
      parts.push({ key: String(h.instrumentId), label: h.ticker, value: h.marketValue });
    }
  }
  if (cash.gt(0)) parts.push({ key: 'cash', label: 'Efectivo disponible', value: cash });

  const total = parts.reduce((acc, p) => acc.plus(p.value), new Big(0));
  if (total.eq(0)) return null;
  return parts.map((p) => ({ ...p, pct: p.value.div(total).times(100) }));
}
