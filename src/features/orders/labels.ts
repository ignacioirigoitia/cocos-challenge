import type { OrderType, Side } from './types';

/** "Compra a mercado", "Venta límite", etc. */
export function operationLabel(side: Side, type: OrderType): string {
  const noun = side === 'BUY' ? 'Compra' : 'Venta';
  return type === 'MARKET' ? `${noun} a mercado` : `${noun} límite`;
}
