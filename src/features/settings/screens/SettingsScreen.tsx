import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type BugMode, type ThemePreference, useSettings } from '@/shared/store/settings';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useTheme } from '@/shared/ui/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const BUG_MODE_OPTIONS: { value: BugMode; label: string }[] = [
  { value: 'off', label: 'off' },
  { value: 'easy', label: 'easy' },
  { value: 'medium', label: 'medium' },
  { value: 'hard', label: 'hard' },
];

export function SettingsScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const candidateId = useSettings((s) => s.candidateId);
  const bugMode = useSettings((s) => s.bugMode);
  const setBugMode = useSettings((s) => s.setBugMode);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: fontSize.title,
          fontWeight: '700',
          padding: spacing.lg,
        }}
      >
        Ajustes
      </Text>

      <Section title="Tema">
        <SegmentedControl label="Tema" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </Section>

      <Section title="Cuenta">
        <Text
          selectable
          accessibilityLabel={`Identificador de tu cuenta: ${candidateId}`}
          style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '600' }}
        >
          {candidateId}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm }}>
          Es tu cuenta de prueba en la API. Tus órdenes y tu efectivo son solo de esta instalación.
        </Text>
      </Section>

      {/* __DEV__ es false en las builds de producción: el selector no existe para el usuario final. */}
      {__DEV__ && (
        <Section title="Modo de la API">
          <SegmentedControl
            label="Modo de la API"
            options={BUG_MODE_OPTIONS}
            value={bugMode}
            onChange={setBugMode}
          />
          <Text
            style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm }}
          >
            Solo desarrollo. Controla el header X-Enable-Bugs: off es el comportamiento correcto y
            los demás inyectan defectos en los datos.
          </Text>
        </Section>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSize.sm,
          marginBottom: spacing.sm,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
