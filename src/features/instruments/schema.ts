import { z } from 'zod';

import { calcReturnPct, parsePrice } from '@/shared/money/money';

// Los precios son `unknown` a propósito: la API puede mandar 0, null o texto, y eso no debe romper la lista.
const InstrumentSchema = z
  .object({
    id: z.number(),
    ticker: z.string(),
    name: z.string(),
    type: z.string(),
    last_price: z.unknown(),
    close_price: z.unknown(),
  })
  .transform(({ last_price, close_price, ...rest }) => {
    const lastPrice = parsePrice(last_price);
    const closePrice = parsePrice(close_price);
    return {
      ...rest,
      lastPrice,
      closePrice,
      returnPct: calcReturnPct(lastPrice, closePrice),
      /** Sin último precio no se puede operar (ni calcular cantidad por monto). */
      tradable: lastPrice !== null,
    };
  });

export const InstrumentsResponseSchema = z.array(InstrumentSchema);

export type Instrument = z.output<typeof InstrumentSchema>;
