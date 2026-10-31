import { StyleSheet, Text, View } from 'react-native';

import { formatARS, formatPct } from '@/shared/money/money';
import { useTheme } from '@/shared/ui/theme';

import type { Instrument } from '../schema';

export function InstrumentRow({ instrument }: { instrument: Instrument }) {
  const { colors, spacing, fontSize } = useTheme();
  const { ticker, name, lastPrice, returnPct } = instrument;

  const price = formatARS(lastPrice);
  const pct = formatPct(returnPct);
  const pctColor = returnPct?.gt(0)
    ? colors.positive
    : returnPct?.lt(0)
      ? colors.negative
      : colors.textSecondary;

  // Un solo texto para lectores de pantalla; "--" se lee como "sin precio".
  const label = `${ticker}, ${name}, ${lastPrice ? price : 'sin precio'}, ${returnPct ? `retorno ${pct}` : 'sin retorno'}`;

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
        <Text
          numberOfLines={1}
          style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}
        >
          {name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '600' }}>
          {price}
        </Text>
        <Text style={{ color: pctColor, fontSize: fontSize.md, marginTop: 2 }}>{pct}</Text>
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
