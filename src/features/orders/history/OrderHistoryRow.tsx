import { StyleSheet, Text, View } from 'react-native';

import { formatDateTime } from '@/shared/format/date';
import { formatARS, formatQuantity } from '@/shared/money/money';
import { useTheme } from '@/shared/ui/theme';

import { orderStatusLabel } from '../status';
import type { HistoryItem } from './items';

export function OrderHistoryRow({ item }: { item: HistoryItem }) {
  const { colors, spacing, fontSize } = useTheme();

  const sideLabel = item.side === 'BUY' ? 'Compra' : 'Venta';
  const ticker = item.ticker ?? '—';
  const typeLabel = item.type === 'MARKET' ? 'Mercado' : 'Límite';
  const detail = `${formatQuantity(item.quantity)} · ${typeLabel}`;
  const statusLabel = orderStatusLabel(item.status);
  const price = formatARS(item.price);
  const when = formatDateTime(item.createdAt);

  const sideColor = item.side === 'BUY' ? colors.positive : colors.negative;
  // Cada estado con su color: ejecutada en verde, pendiente en ámbar, rechazada (o un estado
  // inesperado) en rojo. El texto sigue diciendo el estado: el color no es lo único que lo indica.
  const statusColor =
    item.status === 'FILLED'
      ? colors.positive
      : item.status === 'PENDING'
        ? colors.pending
        : colors.negative;

  // Un solo texto para lectores de pantalla.
  const label = `${sideLabel} ${item.ticker ?? 'instrumento desconocido'}, ${formatQuantity(item.quantity)}, ${typeLabel}, ${statusLabel}, ${item.price ? price : 'sin precio'}, ${when}`;

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}
    >
      <View style={styles.left}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
          <Text style={{ color: sideColor }}>{sideLabel}</Text>
          {` ${ticker}`}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
          {detail}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
          {when}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '600' }}>
          {price}
        </Text>
        <Text
          style={{ color: statusColor, fontSize: fontSize.md, fontWeight: '600', marginTop: 2 }}
        >
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  left: { flex: 1, paddingRight: 12 },
  right: { alignItems: 'flex-end' },
});
