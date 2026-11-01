import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useTheme } from './theme';

interface Props {
  error: Error;
  /** Vuelve a dibujar la pantalla que falló. */
  retry: () => Promise<void>;
}

/** Pantalla de último recurso: si algo inesperado rompe la interfaz, no se queda en blanco. */
export function AppErrorFallback({ error, retry }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { padding: spacing.xl }]}>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: fontSize.title, fontWeight: '700' }}
        >
          Algo salió mal
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.lg,
            marginTop: spacing.sm,
            textAlign: 'center',
          }}
        >
          Tuvimos un problema inesperado. Podés intentar de nuevo.
        </Text>
        {/* El detalle técnico solo en desarrollo: el usuario final no lo necesita. */}
        {__DEV__ && (
          <Text style={{ color: colors.negative, fontSize: fontSize.sm, marginTop: spacing.md }}>
            {error.message}
          </Text>
        )}
        <View style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}>
          <Button label="Reintentar" onPress={() => void retry()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
