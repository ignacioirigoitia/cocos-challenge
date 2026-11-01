import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from './theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Color de fondo cuando está elegida. Por defecto, el color de texto del tema. */
  activeColor?: string;
  /** Una opción deshabilitada se ve apagada, no se puede elegir y se anuncia como tal. */
  disabled?: boolean;
}

interface Props<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  const { colors, fontSize } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.group, { backgroundColor: colors.surface }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled: !!option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              selected && { backgroundColor: option.activeColor ?? colors.text },
              option.disabled && styles.disabled,
            ]}
          >
            <Text
              style={{
                fontSize: fontSize.md,
                fontWeight: '600',
                // Con letra grande una etiqueta puede partirse en dos líneas: que quede centrada.
                textAlign: 'center',
                color: selected ? colors.background : colors.textSecondary,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.4 },
  group: { flexDirection: 'row', borderRadius: 24, padding: 4 },
  // Alto mínimo de 44 pt: tamaño táctil recomendado.
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
