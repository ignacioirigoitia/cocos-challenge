import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { formatARS } from '@/shared/money/money';
import { useTheme } from '@/shared/ui/theme';

import { stepPath } from '../chartGeometry';
import type { InvestedPoint } from '../invested';

const HEIGHT = 120;

const day = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

export function InvestedChart({ points }: { points: InvestedPoint[] }) {
  const { colors, spacing, fontSize } = useTheme();
  const [width, setWidth] = useState(0);

  const count = points.length;
  const now = formatARS(points[count - 1].invested);
  const label = `Gráfico del capital invertido, ${count} ${count === 1 ? 'movimiento' : 'movimientos'}, ahora ${now}`;

  // Se arranca desde 0 (todavía no había nada invertido) para que un solo movimiento también se vea.
  const { d, zeroY, last } = stepPath(
    [0, ...points.map((p) => p.invested.toNumber())],
    width,
    HEIGHT,
  );

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <View
        testID="invested-chart"
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={colors.border} strokeWidth={1} />
            <Path
              testID="invested-line"
              d={d}
              stroke={colors.text}
              strokeWidth={2}
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx={last.x} cy={last.y} r={4} fill={colors.text} />
          </Svg>
        )}
      </View>
      <View style={[styles.dates, { marginTop: spacing.xs }]}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {day(points[0].date)}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {day(points[count - 1].date)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', justifyContent: 'space-between' },
});
