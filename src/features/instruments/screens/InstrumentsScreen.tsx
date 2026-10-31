import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/shared/api/errorMessage';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { InstrumentRow } from '../components/InstrumentRow';
import { useInstruments } from '../useInstruments';

export function InstrumentsScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const { data, isPending, isError, error, refetch, isRefetching } = useInstruments();

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
        Mercado
      </Text>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Cargando instrumentos" color={colors.text} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <InstrumentRow instrument={item} />}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, padding: spacing.xl, textAlign: 'center' }}>
              No hay instrumentos para mostrar.
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
});
