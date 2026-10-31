import { Big } from 'big.js';

/**
 * Valor de las posiciones y total de la cuenta (efectivo + posiciones).
 * Si alguna posición no tiene valor, ambos quedan en null: no se muestra una suma incompleta.
 */
export function calcTotals(cash: Big, holdings: { marketValue: Big | null }[]) {
  let positionsValue: Big | null = new Big(0);
  for (const { marketValue } of holdings) {
    if (!marketValue) {
      positionsValue = null;
      break;
    }
    positionsValue = positionsValue.plus(marketValue);
  }

  return { positionsValue, totalValue: positionsValue ? cash.plus(positionsValue) : null };
}
