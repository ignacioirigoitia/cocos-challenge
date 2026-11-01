import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatARS, formatPct, formatQuantity, formatSignedARS } from '@/shared/money/money';
import { useTheme } from '@/shared/ui/theme';

import type { Holding } from '../schema';

interface Props {
  holding: Holding;
  onPress: (holding: Holding) => void;
}

export function PositionRow({ holding, onPress }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const { ticker, quantity, marketValue, gain, returnPct } = holding;

  const quantityText = formatQuantity(quantity);
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre el formulario de orden"
      onPress={() => onPress(holding)}
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
    </Pressable>
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
