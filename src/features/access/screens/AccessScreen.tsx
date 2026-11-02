import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/shared/store/settings';
import { useSettingsHydrated } from '@/shared/store/useSettingsHydrated';
import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/ui/theme';

import { askBiometrics, biometricsAvailable } from '../biometrics';
import { useAccess } from '../useAccess';

interface MessageProps {
  icon: 'wallet-outline' | 'lock-closed-outline';
  title: string;
  children: React.ReactNode;
}

function Message({ icon, title, children }: MessageProps) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { padding: spacing.xl, gap: spacing.md }]}>
        <Ionicons name={icon} size={48} color={colors.textSecondary} />
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: fontSize.title, fontWeight: '700' }}
        >
          {title}
        </Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

function Body({ children, alert }: { children: string; alert?: boolean }) {
  const { colors, fontSize } = useTheme();

  return (
    <Text
      accessibilityRole={alert ? 'alert' : undefined}
      style={{
        color: alert ? colors.negative : colors.textSecondary,
        fontSize: fontSize.lg,
        textAlign: 'center',
      }}
    >
      {children}
    </Text>
  );
}

function Welcome({ onCreate }: { onCreate: () => void }) {
  const { spacing } = useTheme();

  return (
    <Message icon="wallet-outline" title="Bienvenido">
      <Body>
        Esta app de finanzas permite una sola cuenta por dispositivo: tus órdenes y tu efectivo
        quedan asociados a este teléfono.
      </Body>
      <Body>
        Si tu dispositivo tiene Face ID o huella configurados, te los vamos a pedir cada vez que
        abras la app.
      </Body>
      <View style={{ marginTop: spacing.md }}>
        <Button label="Crear mi cuenta" onPress={onCreate} />
      </View>
    </Message>
  );
}

/**
 * Con cuenta ya creada: si el dispositivo tiene biometría disponible la pide antes de entrar; si
 * no (Expo Go de iOS, un simulador sin Face ID, sin hardware), entra directo para que la app
 * se pueda correr en cualquier lado.
 */
function Lock({ onUnlocked }: { onUnlocked: () => void }) {
  const { spacing } = useTheme();
  const [locked, setLocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const asking = useRef(false);

  const ask = useCallback(async () => {
    if (asking.current) return; // un solo pedido a la vez
    asking.current = true;
    setFailed(false);
    const result = await askBiometrics();
    asking.current = false;
    if (result === 'failed') setFailed(true);
    else onUnlocked();
  }, [onUnlocked]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!(await biometricsAvailable())) {
        if (!cancelled) onUnlocked();
        return;
      }
      if (cancelled) return;
      setLocked(true);
      await ask();
    })();
    return () => {
      cancelled = true;
    };
  }, [ask, onUnlocked]);

  // Mientras se averigua si hay biometría no se muestra nada: ni la app ni el bloqueo.
  if (!locked) return <Blank />;

  return (
    <Message icon="lock-closed-outline" title="App bloqueada">
      <Body>Por seguridad, confirmá que sos vos con Face ID o tu huella para entrar.</Body>
      {failed && <Body alert>No pudimos verificar tu identidad. Probá de nuevo.</Body>}
      <View style={{ marginTop: spacing.md }}>
        <Button label="Desbloquear" onPress={() => void ask()} />
      </View>
    </Message>
  );
}

function Blank() {
  const { colors } = useTheme();
  return <View style={[styles.screen, { backgroundColor: colors.background }]} />;
}

/** Primera pantalla de la app: crea la cuenta (la primera vez) y pide la biometría (las siguientes). */
export function AccessScreen() {
  const hydrated = useSettingsHydrated();
  const accountCreated = useSettings((s) => s.accountCreated);
  const createAccount = useSettings((s) => s.createAccount);
  const unlocked = useAccess((s) => s.unlocked);
  const unlock = useAccess((s) => s.unlock);

  // Hasta que no se cargó lo guardado no se sabe si ya hay cuenta: no se decide nada. Y si ya se
  // desbloqueó (por ejemplo, recién creada la cuenta), no se vuelve a pedir nada mientras la
  // navegación cambia de pantalla.
  if (!hydrated || unlocked) return <Blank />;

  if (!accountCreated) {
    return (
      <Welcome
        onCreate={() => {
          createAccount();
          unlock();
        }}
      />
    );
  }
  return <Lock onUnlocked={unlock} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
