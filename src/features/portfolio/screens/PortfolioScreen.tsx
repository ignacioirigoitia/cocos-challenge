import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/shared/api/errorMessage';
import { useOrders } from '@/features/orders/history/useOrders';
import { calcAccountReturn, formatARS, formatPct, formatSignedARS } from '@/shared/money/money';
import { sortByTicker } from '@/shared/sort/byTicker';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { MovementsSection } from '../components/MovementsSection';
import { PositionRow } from '../components/PositionRow';
import type { Holding, Portfolio } from '../schema';
import { INITIAL_CAPITAL } from '../invested';
import { calcTotals } from '../totals';
import { usePortfolio } from '../usePortfolio';

function Summary({ portfolio }: { portfolio: Portfolio }) {
  const { colors, spacing, fontSize } = useTheme();
  const totalValue = calcTotals(portfolio.cash, portfolio.holdings).totalValue;
  const total = formatARS(totalValue);
  const cash = formatARS(portfolio.cash);

  // Resultado de la cuenta contra el capital con el que arrancó (1.000.000 en una cuenta nueva).
  const result = calcAccountReturn(totalValue, INITIAL_CAPITAL);
  const resultText = result ? `${formatSignedARS(result.gain)} · ${formatPct(result.pct)}` : '--';
  const resultColor = result?.gain.gt(0)
    ? colors.positive
    : result?.gain.lt(0)
      ? colors.negative
      : colors.textSecondary;
  const initial = formatARS(INITIAL_CAPITAL);

  return (
    <View style={{ padding: spacing.lg }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Valor total</Text>
      <Text
        accessible
        accessibilityLabel={`Valor total, ${total}`}
        style={{ color: colors.text, fontSize: fontSize.title, fontWeight: '700', marginTop: 2 }}
      >
        {total}
      </Text>
      <View
        accessible
        accessibilityLabel={`Rendimiento de la cuenta, ${result ? resultText : 'sin dato'}, contra un capital inicial de ${initial}`}
        style={{ marginTop: spacing.xs }}
      >
        <Text style={{ color: resultColor, fontSize: fontSize.lg, fontWeight: '600' }}>
          {resultText}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {`Capital inicial ${initial}`}
        </Text>
      </View>
      <View
        accessible
        accessibilityLabel={`Efectivo disponible, ${cash}`}
        style={[styles.cashRow, { marginTop: spacing.md }]}
      >
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
          Efectivo disponible
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '600' }}>{cash}</Text>
      </View>
    </View>
  );
}

interface Props {
  /** Se llama al tocar una posición (para vender). */
  onSelect: (holding: Holding) => void;
}

export function PortfolioScreen({ onSelect }: Props) {
  const { colors, spacing, fontSize } = useTheme();
  const { data, isPending, isError, error, refetch } = usePortfolio();
  const orders = useOrders(); // el mismo caché que la pestaña Órdenes: no suma pedidos

  // Las posiciones siempre en orden alfabético.
  const holdings = useMemo(() => sortByTicker(data?.holdings ?? []), [data]);

  // El spinner de "tirar para actualizar" es solo del gesto del usuario: si la lista se actualiza
  // por detrás (ej. al revisar una orden) no debe aparecer.
  const [pulling, setPulling] = useState(false);
  const onPull = async () => {
    setPulling(true);
    try {
      await Promise.all([refetch(), orders.refetch()]);
    } finally {
      setPulling(false);
    }
  };

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
        Portfolio
      </Text>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Cargando portfolio" color={colors.text} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <FlatList
          testID="portfolio-list"
          data={holdings}
          keyExtractor={(item) => String(item.instrumentId)}
          renderItem={({ item }) => <PositionRow holding={item} onPress={onSelect} />}
          ListHeaderComponent={
            <>
              <Summary portfolio={data} />
              <MovementsSection orders={orders} />
            </>
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, padding: spacing.xl, textAlign: 'center' }}>
              Todavía no tenés posiciones.
            </Text>
          }
          refreshControl={
            <RefreshControl
              testID="refresh-control"
              refreshing={pulling}
              onRefresh={() => void onPull()}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cashRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
