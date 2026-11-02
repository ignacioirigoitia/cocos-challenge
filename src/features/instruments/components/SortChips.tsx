import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/ui/theme';

import type { SortMode } from '../sort';

interface Props {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}

/**
 * Dos filtros rápidos sobre la lista de Mercado. Sin ninguno activo la lista va A–Z; tocar el
 * activo lo apaga. Es un solo valor, así que nunca puede haber dos activos a la vez.
 */
export function SortChips({ value, onChange }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  const chips: { mode: 'gainers' | 'losers'; label: string; color: string }[] = [
    { mode: 'gainers', label: 'Mayores subas', color: colors.positive },
    { mode: 'losers', label: 'Mayores bajas', color: colors.negative },
  ];

  return (
    <View
      accessibilityLabel="Filtrar por variación del día"
      style={[
        styles.row,
        { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
      ]}
    >
      {chips.map(({ mode, label, color }) => {
        const selected = value === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? 'alphabetical' : mode)}
            style={[
              styles.chip,
              { backgroundColor: selected ? color : colors.surface, paddingHorizontal: spacing.lg },
            ]}
          >
            <Text
              style={{
                fontSize: fontSize.md,
                fontWeight: '600',
                color: selected ? colors.background : colors.textSecondary,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  // Alto mínimo de 44 pt: tamaño táctil recomendado.
  chip: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
