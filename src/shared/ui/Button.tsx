import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const { colors, fontSize } = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        primary && { backgroundColor: colors.text },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={{
          color: primary ? colors.background : colors.textSecondary,
          fontSize: fontSize.lg,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Alto mínimo de 48 pt: tamaño táctil cómodo para el botón principal.
  button: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
