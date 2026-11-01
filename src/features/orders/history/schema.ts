import { z } from 'zod';

import { buildOrder, OrderShape } from '../order';
import { statusForHistory } from '../status';

/** Una fecha ausente o inválida es null (no rompe la lista): esa orden va al final. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const HistoryOrderSchema = OrderShape.extend({ created_at: z.unknown() }).transform((o) => ({
  ...buildOrder(o, statusForHistory),
  createdAt: parseDate(o.created_at),
}));

export const OrdersResponseSchema = z.array(HistoryOrderSchema);

export type HistoryOrder = z.output<typeof HistoryOrderSchema>;
