import type { OrderType, Side } from './types';

/** "Compra a mercado", "Venta límite", etc. */
export function operationLabel(side: Side, type: OrderType): string {
  const noun = side === 'BUY' ? 'Compra' : 'Venta';
  return type === 'MARKET' ? `${noun} a mercado` : `${noun} límite`;
}

export function quantityLabel(quantity: {
  eq: (n: number) => boolean;
  toString: () => string;
}): string {
  return `${quantity.toString()} ${quantity.eq(1) ? 'acción' : 'acciones'}`;
}
