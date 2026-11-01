import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from './theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  /** Texto de ayuda debajo del campo (ej. el máximo permitido). No se muestra si hay un error. */
  hint?: string;
  keyboardType?: 'decimal-pad' | 'number-pad';
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  keyboardType = 'decimal-pad',
}: Props) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder="0"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            fontSize: fontSize.title,
            borderBottomColor: error ? colors.negative : colors.inputBorder,
          },
        ]}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.negative, fontSize: fontSize.sm, marginTop: spacing.xs }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderBottomWidth: 1, paddingVertical: 4 },
});
