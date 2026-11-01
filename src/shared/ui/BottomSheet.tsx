import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from './theme';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

/**
 * Hoja pegada abajo cuyo alto es el del contenido (no hay bloque vacío). Se usa sobre una ruta
 * transparente: el fondo oscuro cierra al tocarlo y el ScrollView solo scrollea si el contenido
 * no entra en la pantalla.
 */
export function BottomSheet({ children, onClose }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const { height } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <Pressable
        testID="sheet-scrim"
        accessible={false}
        onPress={onClose}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: colors.background, maxHeight: height * 0.92 }]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onClose}
            hitSlop={8}
            style={[styles.close, { marginHorizontal: spacing.lg }]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: '600' }}>
              Cerrar
            </Text>
          </Pressable>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 8 },
  // Alto mínimo de 44 pt: tamaño táctil recomendado.
  close: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  // flexGrow: 0 → mide lo que contiene en vez de llenar el espacio.
  scroll: { flexGrow: 0 },
});
