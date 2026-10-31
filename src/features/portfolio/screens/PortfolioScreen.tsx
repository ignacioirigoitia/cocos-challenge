import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/shared/api/errorMessage';
import { formatARS } from '@/shared/money/money';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { PositionRow } from '../components/PositionRow';
import { type Portfolio } from '../schema';
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

export function PortfolioScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching } = usePortfolio();

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
          data={data.holdings}
          keyExtractor={(item) => String(item.instrumentId)}
          renderItem={({ item }) => <PositionRow holding={item} />}
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
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
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
