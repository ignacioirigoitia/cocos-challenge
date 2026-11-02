import type { UseQueryResult } from '@tanstack/react-query';
import type { Big } from 'big.js';
import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { HistoryOrder } from '@/features/orders/history/schema';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { INITIAL_CAPITAL, valueSeries } from '../valueSeries';
import { ValueChart } from './ValueChart';

interface Props {
  orders: UseQueryResult<HistoryOrder[]>;
  /** Total real de hoy (null si falta algún precio): es el último punto del gráfico. */
  totalValue: Big | null;
}

/**
 * Evolución del valor de la cuenta, armada con las órdenes. Es independiente del resto de la
 * pantalla: si las órdenes fallan o tardan, el portfolio se ve igual y esta sección avisa por su cuenta.
 */
export function ValueSection({ orders, totalValue }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const points = useMemo(
    () => valueSeries(orders.data ?? [], INITIAL_CAPITAL, totalValue, new Date()),
    [orders.data, totalValue],
  );

  return (
    <View style={{ padding: spacing.lg }}>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}
      >
        Evolución de la cuenta
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md }}
      >
        Valor estimado con los precios de tus órdenes.
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
        <ValueChart points={points} />
      )}
    </View>
  );
}
