import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/shared/api/errorMessage';
import { formatARS } from '@/shared/money/money';
import { sortByTicker } from '@/shared/sort/byTicker';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { PositionRow } from '../components/PositionRow';
import type { Holding, Portfolio } from '../schema';
import { calcTotals } from '../totals';
import { usePortfolio } from '../usePortfolio';

function Summary({ portfolio }: { portfolio: Portfolio }) {
  const { colors, spacing, fontSize } = useTheme();
  const total = formatARS(calcTotals(portfolio.cash, portfolio.holdings).totalValue);
  const cash = formatARS(portfolio.cash);

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

  // Las posiciones siempre en orden alfabético.
  const holdings = useMemo(() => sortByTicker(data?.holdings ?? []), [data]);

  // El spinner de "tirar para actualizar" es solo del gesto del usuario: si la lista se actualiza
  // por detrás (ej. al revisar una orden) no debe aparecer.
  const [pulling, setPulling] = useState(false);
  const onPull = async () => {
    setPulling(true);
    try {
      await refetch();
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
          ListHeaderComponent={<Summary portfolio={data} />}
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
