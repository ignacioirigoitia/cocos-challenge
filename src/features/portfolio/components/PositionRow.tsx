import { StyleSheet, Text, View } from 'react-native';

import { formatARS, formatPct, formatSignedARS } from '@/shared/money/money';
import { useTheme } from '@/shared/ui/theme';

import type { Holding } from '../schema';

export function PositionRow({ holding }: { holding: Holding }) {
  const { colors, spacing, fontSize } = useTheme();
  const { ticker, quantity, marketValue, gain, returnPct } = holding;

  const quantityText = `${quantity.toString()} ${quantity.eq(1) ? 'acción' : 'acciones'}`;
  const valueText = formatARS(marketValue);
  const resultText = gain ? `${formatSignedARS(gain)} · ${formatPct(returnPct)}` : '--';
  const resultColor = gain?.gt(0)
    ? colors.positive
    : gain?.lt(0)
      ? colors.negative
      : colors.textSecondary;

  // Un solo texto para lectores de pantalla; "--" se lee como "sin valor".
  const label = `${ticker}, ${quantityText}, ${marketValue ? `valor ${valueText}` : 'sin valor'}, ${gain ? `resultado ${resultText}` : 'sin resultado'}`;

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}
    >
      <View style={styles.left}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
          {ticker}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
          {quantityText}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '600' }}>
          {valueText}
        </Text>
        <Text style={{ color: resultColor, fontSize: fontSize.md, marginTop: 2 }}>
          {resultText}
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
    minHeight: 64,
  },
  left: { flex: 1, paddingRight: 12 },
  right: { alignItems: 'flex-end' },
});
