import type { Big } from 'big.js';

import { formatARS, formatPct } from '@/shared/money/money';

import type { Side } from './types';

/**
 * Aviso para cuando una orden se ejecutó a un precio distinto del que el usuario vio en la
 * revisión (en hard, las órdenes a mercado se ejecutan al precio de cierre). `adverse` indica si
 * le perjudica: comprar más caro o vender más barato. null si no hay diferencia o no hay precio.
 */
export function executionPriceNotice(side: Side, executed: Big | null, expected: Big) {
  if (!executed || executed.eq(expected)) return null;

  const diffPct = executed.minus(expected).div(expected).times(100);
  return {
    text: `Se ejecutó a un precio distinto del que viste en la revisión: ${formatARS(executed)} en lugar de ${formatARS(expected)} (${formatPct(diffPct)}).`,
    adverse: side === 'BUY' ? executed.gt(expected) : executed.lt(expected),
  };
}
