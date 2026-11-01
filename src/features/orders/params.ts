import { z } from 'zod';

import { parsePrice } from '@/shared/money/money';

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
