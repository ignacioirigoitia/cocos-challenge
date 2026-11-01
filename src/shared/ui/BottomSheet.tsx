import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

const DURATION_MS = 240;

interface Props {
  /** Contenido, o una función que recibe `close` para cerrar la hoja con su animación de salida. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Se llama cuando la hoja terminó de cerrarse (ahí se navega hacia atrás). */
  onClose: () => void;
}

/**
 * Hoja pegada abajo cuyo alto es el del contenido (no hay bloque vacío). Se usa sobre una ruta
 * transparente y sin animación propia: el fondo oscuro aparece con un fundido, quieto, y solo la
 * hoja sube. Si se animara la ruta entera, el fondo oscuro se vería desplazarse junto con ella.
 */
export function BottomSheet({ children, onClose }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const { height } = useWindowDimensions();
  // 0 = cerrada, 1 = abierta. Alimenta el fundido del fondo y el desplazamiento de la hoja.
  const [progress] = useState(() => new Animated.Value(0));
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = useCallback(() => {
    if (closing.current) return; // un segundo pedido de cierre no hace nada
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          testID="sheet-scrim"
          accessible={false}
          onPress={close}
          style={[StyleSheet.absoluteFill, styles.scrim]}
        />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: colors.background, maxHeight: height * 0.92 }]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={close}
              hitSlop={8}
              style={[styles.close, { marginHorizontal: spacing.lg }]}
            >
              <Text
                style={{ color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: '600' }}
              >
                Cerrar
              </Text>
            </Pressable>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
            >
              <SheetContent close={close}>{children}</SheetContent>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

/** Resuelve el contenido: si es una función, la invoca pasándole `close`. */
function SheetContent({
  children,
  close,
}: {
  children: ReactNode | ((close: () => void) => ReactNode);
  close: () => void;
}) {
  return <>{typeof children === 'function' ? children(close) : children}</>;
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
