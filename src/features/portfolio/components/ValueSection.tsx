import type { UseQueryResult } from '@tanstack/react-query';
import type { Big } from 'big.js';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

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
 * pantalla: si las órdenes fallan, el portfolio se ve igual y esta sección avisa por su cuenta.
 * Mientras carga o si todavía no hay movimientos (cuenta nueva) no se muestra: un título con la
 * sección vacía no aporta nada, y un indicador que después desaparece haría saltar la pantalla.
 */
export function ValueSection({ orders, totalValue }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const points = useMemo(
    () => valueSeries(orders.data ?? [], INITIAL_CAPITAL, totalValue, new Date()),
    [orders.data, totalValue],
  );

  if (!orders.isError && (orders.isPending || points.length === 0)) return null;

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

      {orders.isError ? (
        <ErrorState
          compact
          message="No pudimos cargar los movimientos."
          onRetry={() => orders.refetch()}
        />
      ) : (
        <ValueChart points={points} />
      )}
    </View>
  );
}
