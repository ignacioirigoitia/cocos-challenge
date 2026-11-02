import type { UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { HistoryOrder } from '@/features/orders/history/schema';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { investedSeries } from '../invested';
import { InvestedChart } from './InvestedChart';

/**
 * Capital invertido a lo largo de las órdenes ejecutadas. Es independiente del resto de la pantalla:
 * si las órdenes fallan o tardan, el portfolio se ve igual y esta sección avisa por su cuenta.
 */
export function MovementsSection({ orders }: { orders: UseQueryResult<HistoryOrder[]> }) {
  const { colors, spacing, fontSize } = useTheme();
  const points = useMemo(() => investedSeries(orders.data ?? []), [orders.data]);

  return (
    <View style={{ padding: spacing.lg }}>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}
      >
        Capital invertido
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md }}
      >
        Compras menos ventas ejecutadas. Cada escalón es una orden.
      </Text>

      {orders.isPending ? (
        <ActivityIndicator accessibilityLabel="Cargando movimientos" color={colors.text} />
      ) : orders.isError ? (
        <ErrorState
          compact
          message="No pudimos cargar los movimientos."
          onRetry={() => orders.refetch()}
        />
      ) : points.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }}>
          Todavía no hay movimientos.
        </Text>
      ) : (
        <InvestedChart points={points} />
      )}
    </View>
  );
}
