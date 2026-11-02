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

// Las monedas (ARS) no se operan: los pesos son el efectivo de la cuenta. Se sacan al entrar la
// respuesta, así lo cubre todo a la vez (Mercado, búsqueda e historial). Se filtra lo que se sabe
// que no se opera y no una lista de lo permitido, para no esconder un tipo nuevo sin querer.
export const InstrumentsResponseSchema = z
  .array(InstrumentSchema)
  .transform((list) => list.filter((i) => i.type !== 'MONEDA'));

export type Instrument = z.output<typeof InstrumentSchema>;
