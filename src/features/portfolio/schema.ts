import { Big } from 'big.js';
import { z } from 'zod';

import { calcPosition, parseAmount, parsePrice } from '@/shared/money/money';

// El efectivo es estructural: si no es un monto válido, la respuesta no es confiable.
const CashSchema = z.unknown().transform((value, ctx) => {
  const cash = parseAmount(value);
  if (!cash) {
    ctx.addIssue({ code: 'custom', message: 'efectivo inválido' });
    return z.NEVER;
  }
  return cash;
});

const HoldingSchema = z
  .object({
    instrument_id: z.number(),
    ticker: z.string(),
    quantity: z.number().int().positive(),
    // Los precios son `unknown` a propósito: un precio roto no debe tirar toda la respuesta.
    last_price: z.unknown(),
    close_price: z.unknown(),
    avg_cost_price: z.unknown(),
  })
  .transform((h) => {
    const quantity = new Big(h.quantity);
    const lastPrice = parsePrice(h.last_price);
    const avgCostPrice = parsePrice(h.avg_cost_price);
    return {
      instrumentId: h.instrument_id,
      ticker: h.ticker,
      quantity,
      lastPrice,
      closePrice: parsePrice(h.close_price),
      avgCostPrice,
      ...calcPosition(quantity, lastPrice, avgCostPrice),
    };
  });

export const PortfolioResponseSchema = z.object({
  cash: CashSchema,
  holdings: z.array(HoldingSchema),
});

export type Portfolio = z.output<typeof PortfolioResponseSchema>;
export type Holding = Portfolio['holdings'][number];
