import type { Big } from 'big.js';
import { Text, View } from 'react-native';

import { formatARS } from '@/shared/money/money';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/ui/theme';

import { operationLabel, quantityLabel } from '../labels';
import { type OrderResponse } from '../order';
import { orderStatusInfo } from '../status';
import { estimatedCost } from '../orderMath';
import { SummaryRow } from './SummaryRow';

interface Props {
  order: OrderResponse;
  /** Costo estimado que se mostró en la revisión. */
  estimated: Big;
  /** false si la orden devuelta no es la que se envió. */
  matchesRequest: boolean;
  onClose: () => void;
}

export function OrderResult({ order, estimated, matchesRequest, onClose }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const info = orderStatusInfo(order.status, order.side);
  const toneColor =
    info.tone === 'success'
      ? colors.positive
      : info.tone === 'error'
        ? colors.negative
        : colors.text;

  // Con los valores reales que devolvió la API (no con los estimados).
  const total = order.price ? estimatedCost(order.quantity, order.price) : null;
  const filled = order.status === 'FILLED';
  const pending = order.status === 'PENDING';

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ color: toneColor, fontSize: fontSize.title, fontWeight: '700' }}
      >
        {info.title}
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: fontSize.md, marginVertical: spacing.sm }}
      >
        {info.message}
      </Text>

      <View style={{ marginTop: spacing.md }}>
        <SummaryRow label="Orden" value={`#${order.id}`} />
        <SummaryRow label="Operación" value={operationLabel(order.side, order.type)} />
        <SummaryRow label="Cantidad" value={quantityLabel(order.quantity)} />
        {filled && <SummaryRow label="Precio de ejecución" value={formatARS(order.price)} />}
        {pending && <SummaryRow label="Precio límite" value={formatARS(order.price)} />}
        {filled && <SummaryRow label="Total" value={formatARS(total)} bold />}
        {pending && <SummaryRow label="Monto de la orden" value={formatARS(total)} bold />}
        {filled && total && !total.eq(estimated) && (
          <SummaryRow label="Estimado en la revisión" value={formatARS(estimated)} />
        )}
      </View>

      {!matchesRequest && (
        <Text style={{ color: colors.negative, fontSize: fontSize.md, marginTop: spacing.md }}>
          Los datos devueltos no coinciden con tu orden. Revisá tu portfolio.
        </Text>
      )}

      <View style={{ marginTop: spacing.xl }}>
        <Button label="Listo" onPress={onClose} />
      </View>
    </View>
  );
}
