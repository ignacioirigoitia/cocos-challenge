import { Big } from 'big.js';
import { z } from 'zod';

import { parsePrice } from '@/shared/money/money';

import { parseOrderStatus, statusForType } from './status';
import type { OrderType, Side } from './types';

/** Lo que el usuario quiere enviar, ya validado y con los números como Big. */
export interface OrderRequest {
  instrumentId: number;
  side: Side;
  type: OrderType;
  quantity: Big;
  /** Solo para órdenes LIMIT. */
  price?: Big;
}

/** Body del POST /orders. En JSON los números van como número, no como string. */
export function toOrderBody(request: OrderRequest) {
  const base = {
    instrument_id: request.instrumentId,
    side: request.side,
    type: request.type,
    quantity: request.quantity.toNumber(),
  };
  if (request.type === 'MARKET') return base;
  if (!request.price) throw new Error('Una orden LIMIT necesita precio');
  return { ...base, price: request.price.toNumber() };
}

// Estructura estricta (id, instrumento, lado, tipo y cantidad); estado y precio tolerantes.
export const OrderResponseSchema = z
  .object({
    id: z.number(),
    instrument_id: z.number(),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['MARKET', 'LIMIT']),
    quantity: z.number().int().positive(),
    price: z.unknown(),
    status: z.unknown(),
  })
  .transform((o) => ({
    id: o.id,
    instrumentId: o.instrument_id,
    side: o.side,
    type: o.type,
    quantity: new Big(o.quantity),
    /** Precio de ejecución (MARKET) o precio límite (LIMIT). null si no vino o no es válido. */
    price: parsePrice(o.price),
    // Si el estado no corresponde al tipo de orden, queda UNKNOWN en vez de mostrarse tal cual.
    status: statusForType(o.type, parseOrderStatus(o.status)),
  }));

export type OrderResponse = z.output<typeof OrderResponseSchema>;

/**
 * ¿La orden que devolvió la API es la que se envió? En MARKET el precio no se compara (es el de
 * ejecución); en LIMIT sí. Si no coincide, la pantalla avisa en vez de mostrarla como si nada.
 */
export function responseMatchesRequest(request: OrderRequest, response: OrderResponse): boolean {
  const same =
    response.instrumentId === request.instrumentId &&
    response.side === request.side &&
    response.type === request.type &&
    response.quantity.eq(request.quantity);
  if (!same) return false;
  return request.type === 'LIMIT'
    ? !!response.price && !!request.price && response.price.eq(request.price)
    : true;
}
