import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from './theme';

interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: 'center' }}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        onPress={onRetry}
        style={[
          styles.button,
          { backgroundColor: colors.text, marginTop: spacing.lg, padding: spacing.md },
        ]}
      >
        <Text style={{ color: colors.background, fontSize: fontSize.md, fontWeight: '600' }}>
          Reintentar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Alto mínimo de 44 pt: tamaño táctil recomendado.
  button: {
    minHeight: 44,
    minWidth: 140,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
