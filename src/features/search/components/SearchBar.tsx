import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/shared/ui/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchBar({ value, onChangeText }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          marginHorizontal: spacing.lg,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      {/* Decorativa: el campo ya tiene su etiqueta, el ícono no hay que leerlo. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name="search" size={18} color={colors.textSecondary} />
      </View>
      <TextInput
        accessibilityLabel="Buscar por ticker"
        placeholder="Buscar por ticker"
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[
          styles.input,
          { color: colors.text, fontSize: fontSize.lg, marginLeft: spacing.sm },
        ]}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.clear}
        >
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Alto de 44 pt: tamaño táctil recomendado.
  // minHeight (no height): con letra grande el campo crece en vez de cortar el texto.
  container: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderRadius: 12 },
  input: { flex: 1, minHeight: 44 },
  clear: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
});
