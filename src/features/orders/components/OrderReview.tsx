import type { Big } from 'big.js';
import { Text, View } from 'react-native';

import { errorMessage } from '@/shared/api/errorMessage';
import { formatARS, formatQuantity } from '@/shared/money/money';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/ui/theme';

import type { OrderFormResult } from '../formSchema';
import { operationLabel } from '../labels';
import { isOutcomeUncertain } from '../submitError';
import { SummaryRow } from './SummaryRow';

interface Props {
  ticker: string;
  result: OrderFormResult;
  /** Precio que el usuario vio al abrir el modal. */
  referencePrice: Big;
  /** Precio actual, recién traído de la API. */
  currentPrice: Big;
  submitting: boolean;
  error: unknown;
  onConfirm: () => void;
  onBack: () => void;
}

export function OrderReview({
  ticker,
  result,
  referencePrice,
  currentPrice,
  submitting,
  error,
  onConfirm,
  onBack,
}: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const { request, cost } = result;
  const isBuy = request.side === 'BUY';
  const note = { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.md };

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: fontSize.title, fontWeight: '700' }}
      >
        Revisá tu orden
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: fontSize.md, marginBottom: spacing.md }}
      >
        Todavía no se envió
      </Text>

      <SummaryRow label="Operación" value={operationLabel(request.side, request.type)} />
      <SummaryRow label="Instrumento" value={ticker} />
      <SummaryRow label="Cantidad" value={formatQuantity(request.quantity)} />
      {request.type === 'LIMIT' && request.price ? (
        <SummaryRow label="Precio límite" value={formatARS(request.price)} />
      ) : (
        <SummaryRow label="Precio actual" value={formatARS(currentPrice)} />
      )}
      <SummaryRow
        label={isBuy ? 'Costo estimado' : 'Importe estimado'}
        value={formatARS(cost)}
        bold
      />

      {!referencePrice.eq(currentPrice) && (
        <Text style={{ ...note, color: colors.text }}>
          {`El precio cambió de ${formatARS(referencePrice)} a ${formatARS(currentPrice)}.`}
        </Text>
      )}
      <Text style={note}>
        {request.type === 'MARKET'
          ? 'El precio final puede ser distinto: una orden a mercado se ejecuta al precio del momento.'
          : 'Si el mercado no llega a tu precio, la orden queda pendiente.'}
      </Text>

      {error ? (
        <View style={{ marginTop: spacing.md }}>
          <Text accessibilityRole="alert" style={{ color: colors.negative, fontSize: fontSize.md }}>
            {errorMessage(error)}
          </Text>
          {isOutcomeUncertain(error) && (
            <Text style={{ color: colors.negative, fontSize: fontSize.md, marginTop: spacing.xs }}>
              No sabemos si la orden llegó a enviarse. Revisá tu portfolio antes de volver a
              intentar.
            </Text>
          )}
        </View>
      ) : null}

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Button
          label={submitting ? 'Enviando…' : 'Confirmar y enviar'}
          onPress={onConfirm}
          disabled={submitting}
        />
        <Button label="Volver" variant="ghost" onPress={onBack} disabled={submitting} />
      </View>
    </View>
  );
}
