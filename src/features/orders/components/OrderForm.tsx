import { Big } from 'big.js';
import { useEffect } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import { formatARS, parseUserNumber } from '@/shared/money/money';
import { Button } from '@/shared/ui/Button';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import { useTheme } from '@/shared/ui/theme';

import type { OrderFormResult, OrderFormValues } from '../formSchema';
import type { Side } from '../types';
import { clampToMax } from '../inputLimits';
import { quantityLabel } from '../labels';
import { quantityFromAmount } from '../orderMath';
import { SummaryRow } from './SummaryRow';

export type OrderFormApi = UseFormReturn<OrderFormValues, undefined, OrderFormResult>;

interface Props {
  form: OrderFormApi;
  ticker: string;
  cash: Big;
  held: Big;
  lastPrice: Big;
  /** Costo (o importe) estimado si lo escrito hasta ahora es una orden válida. */
  cost: Big | null;
  busy: boolean;
  error: string | null;
  onReview: () => void;
}

const TYPES = [
  { value: 'MARKET', label: 'Mercado' },
  { value: 'LIMIT', label: 'Límite' },
] as const;
const MODES = [
  { value: 'quantity', label: 'Cantidad' },
  { value: 'amount', label: 'Monto en $' },
] as const;

export function OrderForm({
  form,
  ticker,
  cash,
  held,
  lastPrice,
  cost,
  busy,
  error,
  onReview,
}: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const { control } = form;
  const values = useWatch({ control });
  const errors = form.formState.errors;

  const amount = values.mode === 'amount' ? parseUserNumber(values.amountText ?? '') : null;
  const estimatedQuantity = amount?.gt(0) ? quantityFromAmount(amount, lastPrice) : null;
  const cashText = formatARS(cash);

  // Vender solo tiene sentido si se tiene el activo: se sabe de antemano, no hace falta esperar a
  // que el usuario toque "Revisar orden" para avisarle.
  const canSell = held.gt(0);
  const isSell = values.side === 'SELL';

  // Máximos que ya se conocen, para no dejar escribir algo imposible.
  // - Acciones: al vender, las que se tienen; al comprar, las que alcanzan con el efectivo, al
  //   precio con el que se paga (el de referencia en MARKET, el límite en LIMIT). Si todavía no
  //   hay precio límite no se puede calcular y no se limita nada.
  // - Pesos: al vender, el valor de todas las acciones; al comprar, el efectivo.
  const limitPrice = values.type === 'LIMIT' ? parseUserNumber(values.priceText ?? '') : null;
  const buyPrice = values.type === 'MARKET' ? lastPrice : limitPrice?.gt(0) ? limitPrice : null;
  const maxQuantity: Big | null = isSell
    ? held
    : buyPrice
      ? quantityFromAmount(cash, buyPrice)
      : null;
  const maxAmount = (isSell ? held.times(lastPrice) : cash).round(2, 0);

  // Si cambia el máximo (otro tipo de orden, otro precio límite, de comprar a vender), lo que ya
  // estaba escrito se vuelve a recortar.
  const maxQuantityText = maxQuantity?.toString() ?? null;
  const maxAmountText = maxAmount.toString();
  useEffect(() => {
    const quantityText = form.getValues('quantityText');
    const amountText = form.getValues('amountText');
    const quantity =
      maxQuantityText === null
        ? quantityText
        : clampToMax(quantityText, new Big(maxQuantityText), 0);
    const amount = clampToMax(amountText, new Big(maxAmountText), 2);
    if (quantity !== quantityText) form.setValue('quantityText', quantity);
    if (amount !== amountText) form.setValue('amountText', amount);
  }, [form, maxQuantityText, maxAmountText]);
  const sides: SegmentOption<Side>[] = [
    { value: 'BUY', label: 'Comprar', activeColor: colors.positive },
    { value: 'SELL', label: 'Vender', activeColor: colors.negative, disabled: !canSell },
  ];

  return (
    <View>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Controller
          control={control}
          name="side"
          render={({ field }) => (
            <SegmentedControl
              label="Operación"
              options={sides}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {!canSell && (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            {`No tenés acciones de ${ticker} para vender.`}
          </Text>
        )}
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              label="Tipo de orden"
              options={TYPES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <SegmentedControl
              label="Ingresar por"
              options={MODES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </View>

      {values.mode === 'quantity' ? (
        <Controller
          control={control}
          name="quantityText"
          render={({ field }) => (
            <TextField
              label="Cantidad de acciones"
              value={field.value}
              onChangeText={(text) =>
                field.onChange(maxQuantity ? clampToMax(text, maxQuantity, 0) : text)
              }
              keyboardType="number-pad"
              error={errors.quantityText?.message}
              hint={maxQuantity ? `Máximo: ${quantityLabel(maxQuantity)}` : undefined}
            />
          )}
        />
      ) : (
        <Controller
          control={control}
          name="amountText"
          render={({ field }) => (
            <TextField
              label="Monto en pesos"
              value={field.value}
              onChangeText={(text) => field.onChange(clampToMax(text, maxAmount, 2))}
              error={errors.amountText?.message}
              hint={`Máximo: ${formatARS(maxAmount)}`}
            />
          )}
        />
      )}

      {values.type === 'LIMIT' && (
        <Controller
          control={control}
          name="priceText"
          render={({ field }) => (
            <TextField
              label="Precio límite"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.priceText?.message}
            />
          )}
        />
      )}

      <View style={{ marginTop: spacing.lg }}>
        {estimatedQuantity?.gt(0) && (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            {`Cantidad estimada: ${quantityLabel(estimatedQuantity)}`}
          </Text>
        )}
        <SummaryRow
          label={values.side === 'BUY' ? 'Costo estimado' : 'Importe estimado'}
          value={formatARS(cost)}
          bold
        />
        <View accessible accessibilityLabel={`Efectivo disponible, ${cashText}`}>
          <SummaryRow label="Efectivo disponible" value={cashText} />
        </View>
        {values.side === 'SELL' && (
          <SummaryRow label="Acciones en cartera" value={held.toString()} />
        )}
      </View>

      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.negative, fontSize: fontSize.md, marginTop: spacing.md }}
        >
          {error}
        </Text>
      )}

      <View style={{ marginTop: spacing.xl }}>
        <Button label="Revisar orden" onPress={onReview} disabled={busy} />
      </View>
    </View>
  );
}
