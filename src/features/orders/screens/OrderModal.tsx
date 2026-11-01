import { Text } from 'react-native';

import { BottomSheet } from '@/shared/ui/BottomSheet';
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
      <BottomSheet onClose={onClose}>
        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.lg,
            textAlign: 'center',
            paddingVertical: spacing.xl,
          }}
        >
          No pudimos abrir la orden. Los datos del instrumento no son válidos.
        </Text>
      </BottomSheet>
    );
  }

  return <OrderScreen params={parsed.data} onClose={onClose} />;
}
