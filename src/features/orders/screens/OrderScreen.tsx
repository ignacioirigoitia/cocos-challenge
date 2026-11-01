import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Big } from 'big.js';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { usePortfolio } from '@/features/portfolio/usePortfolio';
import { errorMessage } from '@/shared/api/errorMessage';
import { formatARS } from '@/shared/money/money';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { OrderForm } from '../components/OrderForm';
import { OrderResult } from '../components/OrderResult';
import { OrderReview } from '../components/OrderReview';
import { createOrderFormSchema, type OrderFormResult, type OrderFormValues } from '../formSchema';
import { type OrderRequest, type OrderResponse, responseMatchesRequest } from '../order';
import type { OrderParams } from '../params';
import { refreshOrderData } from '../refreshOrderData';
import { useSubmitOrder } from '../useSubmitOrder';

type Step =
  | { name: 'form' }
  | { name: 'review'; ticker: string; result: OrderFormResult; currentPrice: Big }
  | {
      name: 'result';
      order: OrderResponse;
      request: OrderRequest;
      estimated: Big;
      expectedPrice: Big;
    };

interface Props {
  params: OrderParams;
  onClose: () => void;
}

/** Modal de orden: formulario → revisión (con datos frescos) → resultado. */
export function OrderScreen({ params, onClose }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const client = useQueryClient();
  const portfolio = usePortfolio();
  const submit = useSubmitOrder();

  const [step, setStep] = useState<Step>({ name: 'form' });
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const { instrumentId, lastPrice } = params;
  const cash = portfolio.data?.cash;
  const held = useMemo(
    () =>
      portfolio.data?.holdings.find((h) => h.instrumentId === instrumentId)?.quantity ?? new Big(0),
    [portfolio.data, instrumentId],
  );
  // Validación con los datos que se conocen al abrir; al revisar se repite con datos frescos.
  const schema = useMemo(
    () =>
      lastPrice && cash ? createOrderFormSchema({ instrumentId, lastPrice, cash, held }) : null,
    [instrumentId, lastPrice, cash, held],
  );

  const form = useForm<OrderFormValues, undefined, OrderFormResult>({
    defaultValues: {
      side: params.side,
      type: 'MARKET',
      mode: 'quantity',
      quantityText: '',
      amountText: '',
      priceText: '',
    },
    resolver: schema ? zodResolver(schema) : undefined,
  });
  // Si se abrió en modo venta pero no se tiene el activo, se arranca comprando.
  const canSell = held.gt(0);
  useEffect(() => {
    if (portfolio.data && !canSell && form.getValues('side') === 'SELL')
      form.setValue('side', 'BUY');
  }, [portfolio.data, canSell, form]);

  const values = useWatch({ control: form.control });
  const preview = schema?.safeParse(values);
  const cost = preview?.success ? preview.data.cost : null;

  const onReview = form.handleSubmit(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const fresh = await refreshOrderData(client, instrumentId);
      const currentPrice = fresh.instrument?.lastPrice;
      if (!fresh.instrument) return setCheckError('Este instrumento ya no está disponible.');
      // Los parámetros de la ruta no son confiables: si el ticker no es el del instrumento real de
      // ese id, la orden se enviaría sobre algo distinto de lo que muestra la pantalla.
      if (fresh.instrument.ticker.trim().toUpperCase() !== params.ticker.trim().toUpperCase()) {
        return setCheckError(
          'El instrumento no coincide con el que elegiste. Cerrá esta pantalla y volvé a abrirlo desde el listado.',
        );
      }
      if (!currentPrice) return setCheckError('Este instrumento ya no tiene precio disponible.');

      const parsed = createOrderFormSchema({
        instrumentId,
        lastPrice: currentPrice,
        cash: fresh.cash,
        held: fresh.held,
      }).safeParse(form.getValues());
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          form.setError(issue.path[0] as keyof OrderFormValues, {
            type: 'validate',
            message: issue.message,
          });
        }
        return;
      }
      setStep({
        name: 'review',
        ticker: fresh.instrument.ticker,
        result: parsed.data,
        currentPrice,
      });
    } catch (e) {
      // Sin precio actualizado no se avanza: no se confirma con un dato viejo.
      setCheckError(`No pudimos actualizar el precio. ${errorMessage(e)}`);
    } finally {
      setChecking(false);
    }
  });

  const onConfirm = () => {
    if (step.name !== 'review' || submit.isPending) return;
    const { request, cost: estimated } = step.result;
    submit.mutate(request, {
      onSuccess: (order) =>
        setStep({ name: 'result', order, request, estimated, expectedPrice: step.currentPrice }),
    });
  };

  const onBack = () => {
    submit.reset();
    setStep({ name: 'form' });
  };

  // La hoja (BottomSheet) la pone OrderModal: acá solo está el contenido.
  const frame = (children: React.ReactNode) => <View>{children}</View>;

  if (!lastPrice) {
    return frame(
      <View style={styles.center}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: 'center' }}>
          Este instrumento no tiene precio disponible.
        </Text>
      </View>,
    );
  }
  if (portfolio.isPending) {
    return frame(
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando datos de tu cuenta" color={colors.text} />
      </View>,
    );
  }
  if (portfolio.isError) {
    return frame(
      <ErrorState
        compact
        message={errorMessage(portfolio.error)}
        onRetry={() => portfolio.refetch()}
      />,
    );
  }

  if (step.name === 'review') {
    return frame(
      <OrderReview
        ticker={step.ticker}
        result={step.result}
        referencePrice={lastPrice}
        currentPrice={step.currentPrice}
        submitting={submit.isPending}
        error={submit.error}
        onConfirm={onConfirm}
        onBack={onBack}
      />,
    );
  }
  if (step.name === 'result') {
    return frame(
      <OrderResult
        order={step.order}
        estimated={step.estimated}
        expectedPrice={step.expectedPrice}
        matchesRequest={responseMatchesRequest(step.request, step.order)}
        onClose={onClose}
      />,
    );
  }

  return frame(
    <View>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: fontSize.title, fontWeight: '700' }}
      >
        {`${values.side === 'BUY' ? 'Comprar' : 'Vender'} ${params.ticker}`}
      </Text>
      {params.name ? (
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{params.name}</Text>
      ) : null}
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.xs }}>
        {`Precio de referencia ${formatARS(lastPrice)}`}
      </Text>
      <OrderForm
        form={form}
        ticker={params.ticker}
        cash={portfolio.data.cash}
        held={held}
        lastPrice={lastPrice}
        cost={cost}
        busy={checking}
        error={checkError}
        onReview={() => void onReview()}
      />
    </View>,
  );
}

const styles = StyleSheet.create({
  // Sin flex: 1. La hoja se ajusta al alto del contenido, así que necesita un alto propio.
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
});
