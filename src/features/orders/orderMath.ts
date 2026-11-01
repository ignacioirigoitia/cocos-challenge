import type { Big } from 'big.js';

/**
 * Cantidad máxima de acciones enteras que alcanza con `amount` al precio `price`.
 * big.js redondea la división a 20 decimales, y eso puede "subir" un resultado apenas menor a un
 * entero. Como la multiplicación es exacta, se verifica y se corrige: nunca cuesta más que `amount`.
 */
export function quantityFromAmount(amount: Big, price: Big): Big {
  const quantity = amount.div(price).round(0, 0); // 0 = redondear hacia abajo
  return quantity.times(price).gt(amount) ? quantity.minus(1) : quantity;
}

export function estimatedCost(quantity: Big, price: Big): Big {
  return quantity.times(price);
}
