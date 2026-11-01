import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/shared/ui/Button';
import { useTheme } from '@/shared/ui/theme';

import { OrderParamsSchema } from '../params';
import { OrderScreen } from './OrderScreen';

interface Props {
  /** Parámetros crudos de la ruta: no son confiables, se validan antes de abrir nada. */
  rawParams: Record<string, string | string[] | undefined>;
  onClose: () => void;
}

export function OrderModal({ rawParams, onClose }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const parsed = OrderParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: 'center' }}>
          No pudimos abrir la orden. Los datos del instrumento no son válidos.
        </Text>
        <View style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}>
          <Button label="Cerrar" onPress={onClose} />
        </View>
      </View>
    );
  }

  return <OrderScreen params={parsed.data} onClose={onClose} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
