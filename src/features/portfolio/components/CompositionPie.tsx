import { Big } from 'big.js';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatARS, formatShare } from '@/shared/money/money';
import { cashSliceColor, sliceColors, useTheme } from '@/shared/ui/theme';

import { calcComposition } from '../composition';
import { pieSlices } from '../pieGeometry';
import type { Holding } from '../schema';

const SIZE = 160;

/** De qué está compuesta la cartera: cada posición y el efectivo, con su porcentaje del total. */
export function CompositionPie({ cash, holdings }: { cash: Big; holdings: Holding[] }) {
  const { colors, spacing, fontSize } = useTheme();
  const slices = calcComposition(cash, holdings);

  // Cada posición toma un color por su lugar (en orden alfabético); el efectivo siempre es gris.
  const colorOf = (key: string) =>
    key === 'cash'
      ? cashSliceColor
      : sliceColors[holdings.findIndex((h) => String(h.instrumentId) === key) % sliceColors.length];

  return (
    <View style={{ padding: spacing.lg }}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: fontSize.lg,
          fontWeight: '700',
          marginBottom: spacing.md,
        }}
      >
        Composición de tu cartera
      </Text>

      {!slices ? (
        <Text style={{ color: colors.textSecondary }}>
          No se puede mostrar la composición: falta el precio de alguna posición.
        </Text>
      ) : (
        <>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Composición de la cartera: ${slices.map((s) => `${s.label} ${formatShare(s.pct)}`).join(', ')}`}
            style={styles.pie}
          >
            <Svg width={SIZE} height={SIZE}>
              {pieSlices(
                slices.map((s) => s.pct.div(100).toNumber()),
                SIZE / 2,
                SIZE / 2,
                SIZE / 2 - 2,
              ).map((slice, i) =>
                'circle' in slice ? (
                  <Circle
                    key={slices[i].key}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={SIZE / 2 - 2}
                    fill={colorOf(slices[i].key)}
                  />
                ) : (
                  <Path
                    key={slices[i].key}
                    d={slice.d}
                    fill={colorOf(slices[i].key)}
                    stroke={colors.background}
                    strokeWidth={1}
                  />
                ),
              )}
            </Svg>
          </View>

          {slices.map((s) => (
            <View
              key={s.key}
              testID={`legend-${s.key}`}
              style={[styles.row, { paddingVertical: spacing.sm }]}
            >
              <View
                testID={`legend-dot-${s.key}`}
                style={[styles.dot, { backgroundColor: colorOf(s.key), marginRight: spacing.md }]}
              />
              <Text
                style={{ flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '600' }}
              >
                {s.label}
              </Text>
              <View style={styles.amounts}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '600' }}>
                  {formatShare(s.pct)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {formatARS(s.value)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pie: { alignItems: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  amounts: { alignItems: 'flex-end' },
});
