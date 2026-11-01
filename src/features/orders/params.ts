import type { Big } from 'big.js';
import { z } from 'zod';

import { parsePrice } from '@/shared/money/money';

import type { Side } from './types';

/**
 * Parámetros con los que se abre el modal. Viajan por la ruta, que no es confiable (un deep link
 * puede traer cualquier cosa), así que se validan. Un precio ausente o inválido deja el
 * instrumento sin precio: el modal no deja operarlo.
 */
export const OrderParamsSchema = z
  .object({
    instrumentId: z.string().regex(/^\d+$/),
    ticker: z.string().min(1),
    name: z.string().default(''),
    lastPrice: z.string().optional(),
    side: z.enum(['BUY', 'SELL']).default('BUY'),
  })
  .transform((p) => ({
    instrumentId: Number(p.instrumentId),
    ticker: p.ticker,
    name: p.name,
    lastPrice: parsePrice(p.lastPrice),
    side: p.side,
  }));

export type OrderParams = z.output<typeof OrderParamsSchema>;

/** Ruta del modal para un instrumento. Los parámetros viajan como texto y se validan al abrir. */
export function orderHref(input: {
  instrumentId: number;
  ticker: string;
  name: string;
  lastPrice: Big | null;
  side?: Side;
}) {
  return {
    pathname: '/order' as const,
    params: {
      instrumentId: String(input.instrumentId),
      ticker: input.ticker,
      name: input.name,
      // toFixed evita la notación científica ("1e-7"), que el esquema no acepta.
      ...(input.lastPrice && { lastPrice: input.lastPrice.toFixed() }),
      side: input.side ?? 'BUY',
    },
  };
}
