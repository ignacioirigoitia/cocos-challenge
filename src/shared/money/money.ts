import { Big } from 'big.js';

const NUMERIC = /^-?\d+(\.\d+)?$/;

/**
 * Convierte un precio que llega de la API a Big. null si no hay precio usable:
 * inválido, no finito o <= 0 (la API manda last_price: 0 como defecto).
 * Se pasa por string para no operar nunca con el float.
 */
export function parsePrice(value: unknown): Big | null {
  let text: string;
  if (typeof value === 'number' && Number.isFinite(value)) text = String(value);
  else if (typeof value === 'string' && NUMERIC.test(value.trim())) text = value.trim();
  else return null;

  const price = new Big(text);
  return price.gt(0) ? price : null;
}

/** Retorno en % entre el último precio y el cierre. null si falta algún dato o el cierre es 0. */
export function calcReturnPct(last: Big | null, close: Big | null): Big | null {
  if (!last || !close || close.eq(0)) return null;
  return last.minus(close).div(close).times(100);
}

export interface PositionValues {
  marketValue: Big | null;
  gain: Big | null;
  returnPct: Big | null;
}

/**
 * Valor de mercado (cantidad x último precio), ganancia en $ y rendimiento en %
 * contra el costo promedio. Lo que no se puede calcular queda en null, nunca en 0.
 */
export function calcPosition(
  quantity: Big,
  lastPrice: Big | null,
  avgCostPrice: Big | null,
): PositionValues {
  const marketValue = lastPrice ? quantity.times(lastPrice) : null;
  if (!marketValue || !avgCostPrice) return { marketValue, gain: null, returnPct: null };

  const cost = quantity.times(avgCostPrice);
  const gain = marketValue.minus(cost);
  return { marketValue, gain, returnPct: cost.eq(0) ? null : gain.div(cost).times(100) };
}

const NO_DATA = '--';

function round2(value: Big): Big {
  return value.round(2, Big.roundHalfUp);
}

/** "$ 1.234,50" (con "-" adelante si es negativo). "--" si no hay dato. */
export function formatARS(value: Big | null): string {
  if (!value) return NO_DATA;
  const rounded = round2(value);
  const [int, dec] = rounded.abs().toFixed(2).split('.');
  const withThousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded.lt(0) ? '-' : ''}$ ${withThousands},${dec}`;
}

/** "+7,99%" / "-8,69%" / "0,00%". "--" si no hay dato. */
export function formatPct(value: Big | null): string {
  if (!value) return NO_DATA;
  const rounded = round2(value);
  const sign = rounded.gt(0) ? '+' : rounded.lt(0) ? '-' : '';
  return `${sign}${rounded.abs().toFixed(2).replace('.', ',')}%`;
}
