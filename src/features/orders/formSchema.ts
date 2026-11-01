import type { Big } from 'big.js';
import { z } from 'zod';

import { formatARS, parseUserNumber } from '@/shared/money/money';

import type { OrderRequest } from './order';
import { estimatedCost, quantityFromAmount } from './orderMath';

const MAX_QUANTITY = 1_000_000_000;

/** Datos del momento contra los que se valida la orden. El precio ya tiene que ser válido. */
export interface OrderContext {
  instrumentId: number;
  lastPrice: Big;
  /** Efectivo disponible. */
  cash: Big;
  /** Acciones que se tienen de este instrumento. */
  held: Big;
}

// Lo que escribe el usuario: todo texto, nunca floats.
const FormValuesSchema = z.object({
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  mode: z.enum(['quantity', 'amount']),
  quantityText: z.string(),
  amountText: z.string(),
  priceText: z.string(),
});

export type OrderFormValues = z.input<typeof FormValuesSchema>;

const hasDecimals = (n: Big) => !n.round(0, 0).eq(n);
const hasMoreThan2Decimals = (n: Big) => !n.round(2, 0).eq(n);

/**
 * Valida el formulario y calcula la orden: cantidad (directa o a partir del monto con el último
 * precio, como pide el enunciado), costo estimado y el pedido listo para enviar.
 */
export function createOrderFormSchema(ctx: OrderContext) {
  return FormValuesSchema.transform((v, zodCtx) => {
    let valid = true;
    const fail = (field: keyof OrderFormValues, message: string) => {
      zodCtx.addIssue({ code: 'custom', path: [field], message });
      valid = false;
    };

    // Precio límite (solo en LIMIT)
    let limitPrice: Big | undefined;
    if (v.type === 'LIMIT') {
      const price = parseUserNumber(v.priceText);
      if (!price || price.lte(0) || hasMoreThan2Decimals(price)) {
        fail('priceText', 'Ingresá un precio límite mayor a 0, con hasta 2 decimales.');
      } else {
        limitPrice = price;
      }
    }

    // Cantidad: directa, o la máxima que alcanza con el monto al último precio.
    const field = v.mode === 'quantity' ? 'quantityText' : 'amountText';
    let quantity: Big | undefined;
    if (v.mode === 'quantity') {
      const q = parseUserNumber(v.quantityText);
      if (!q || q.lte(0)) fail(field, 'Ingresá una cantidad mayor a 0.');
      else if (hasDecimals(q)) fail(field, 'La cantidad tiene que ser un número entero.');
      else quantity = q;
    } else {
      const amount = parseUserNumber(v.amountText);
      if (!amount || amount.lte(0)) {
        fail(field, 'Ingresá un monto mayor a 0.');
      } else {
        const q = quantityFromAmount(amount, ctx.lastPrice);
        if (q.lte(0))
          fail(field, `El monto no alcanza para 1 acción (${formatARS(ctx.lastPrice)}).`);
        else quantity = q;
      }
    }
    if (quantity && quantity.gt(MAX_QUANTITY)) {
      fail(field, 'La cantidad es demasiado grande.');
      quantity = undefined;
    }
    if (!valid || !quantity) return z.NEVER;

    // Fondos y tenencias. El costo usa el precio de la orden: el límite, o el último en MARKET.
    const unitPrice = limitPrice ?? ctx.lastPrice;
    const cost = estimatedCost(quantity, unitPrice);
    if (v.side === 'BUY' && cost.gt(ctx.cash)) {
      fail(
        field,
        `No tenés efectivo suficiente. Necesitás ${formatARS(cost)} y tenés ${formatARS(ctx.cash)}.`,
      );
    }
    if (v.side === 'SELL' && quantity.gt(ctx.held)) {
      fail(
        field,
        ctx.held.eq(0)
          ? 'No tenés acciones de este instrumento para vender.'
          : `No tenés suficientes acciones. Tenés ${ctx.held.toString()}.`,
      );
    }
    if (!valid) return z.NEVER;

    const request: OrderRequest = {
      instrumentId: ctx.instrumentId,
      side: v.side,
      type: v.type,
      quantity,
      ...(limitPrice && { price: limitPrice }),
    };
    return { request, unitPrice, cost };
  });
}

export type OrderFormResult = z.output<ReturnType<typeof createOrderFormSchema>>;
