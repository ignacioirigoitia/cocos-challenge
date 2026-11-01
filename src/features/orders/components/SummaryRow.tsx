import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/ui/theme';

interface Props {
  label: string;
  value: string;
  bold?: boolean;
}

export function SummaryRow({ label, value, bold = false }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <View style={[styles.row, { paddingVertical: spacing.sm }]}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.md,
          fontWeight: bold ? '700' : '500',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
