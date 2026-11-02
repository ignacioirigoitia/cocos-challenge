import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { formatARS } from '@/shared/money/money';
import { useTheme } from '@/shared/ui/theme';

import { lineChart } from '../chartGeometry';
import type { ValuePoint } from '../valueSeries';

const HEIGHT = 160;
/** Espacio a la derecha para los valores del eje. */
const GUTTER = 96;

const day = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

export function ValueChart({ points }: { points: ValuePoint[] }) {
  const { colors, spacing, fontSize } = useTheme();
  const [width, setWidth] = useState(0);
  const chartWidth = Math.max(width - GUTTER, 0);

  const first = points[0];
  const last = points[points.length - 1];
  const label = `Evolución del valor de la cuenta, estimada: pasó de ${formatARS(first.value)} a ${formatARS(last.value)}`;

  const chart = useMemo(
    () =>
      lineChart(
        points.map((p) => ({ time: p.date.getTime(), value: p.value })),
        chartWidth,
        HEIGHT,
      ),
    [points, chartWidth],
  );

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <View
        testID="value-chart"
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          <>
            <Svg width={chartWidth} height={HEIGHT}>
              {chart.ticks.map((t, i) => (
                <Line
                  key={i}
                  x1={0}
                  x2={chartWidth}
                  y1={t.y}
                  y2={t.y}
                  stroke={colors.border}
                  strokeWidth={1}
                />
              ))}
              <Path
                testID="value-line"
                d={chart.d}
                stroke={colors.text}
                strokeWidth={2}
                strokeLinejoin="round"
                fill="none"
              />
              <Circle cx={chart.last.x} cy={chart.last.y} r={4} fill={colors.text} />
            </Svg>
            {chart.ticks.map((t, i) => (
              <Text
                key={i}
                testID={`value-tick-${i}`}
                style={[
                  styles.tick,
                  {
                    left: chartWidth + spacing.sm,
                    top: t.y - 8,
                    color: colors.textSecondary,
                    fontSize: fontSize.sm,
                  },
                ]}
              >
                {formatARS(t.value)}
              </Text>
            ))}
          </>
        )}
      </View>
      <View style={[styles.dates, { marginTop: spacing.xs, width: chartWidth || undefined }]}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {day(first.date)}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{day(last.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { position: 'absolute' },
});
