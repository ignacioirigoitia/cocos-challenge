import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useInstruments } from '@/features/instruments/useInstruments';
import { errorMessage } from '@/shared/api/errorMessage';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { toHistoryItems } from './items';
import { OrderHistoryRow } from './OrderHistoryRow';
import { useOrders } from './useOrders';

export function OrdersScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const orders = useOrders();
  // El ticker sale de la lista de instrumentos (la misma consulta que usa Mercado).
  const instruments = useInstruments();

  const items = useMemo(
    () => (orders.data && instruments.data ? toHistoryItems(orders.data, instruments.data) : []),
    [orders.data, instruments.data],
  );

  // Se necesitan las dos listas: sin los instrumentos no se pueden nombrar las órdenes, y no se
  // muestra un historial a medias.
  const isPending = orders.isPending || instruments.isPending;
  const failure = orders.isError ? orders.error : instruments.isError ? instruments.error : null;
  const hasError = orders.isError || instruments.isError;

  // El spinner de "tirar para actualizar" es solo del gesto del usuario, no de un refresco por detrás.
  const [pulling, setPulling] = useState(false);
  const refetchAll = () => Promise.all([orders.refetch(), instruments.refetch()]);
  const onPull = async () => {
    setPulling(true);
    try {
      await refetchAll();
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
        Órdenes
      </Text>

      {isPending && !hasError ? (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Cargando órdenes" color={colors.text} />
        </View>
      ) : hasError ? (
        <ErrorState message={errorMessage(failure)} onRetry={() => void refetchAll()} />
      ) : (
        <FlatList
          testID="orders-list"
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderHistoryRow item={item} />}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, padding: spacing.xl, textAlign: 'center' }}>
              Todavía no hiciste órdenes.
            </Text>
          }
          refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void onPull()} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
