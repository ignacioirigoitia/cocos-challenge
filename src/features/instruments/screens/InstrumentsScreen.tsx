import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchBar } from '@/features/search/components/SearchBar';
import { SEARCH_DEBOUNCE_MS, useSearchInstruments } from '@/features/search/useSearchInstruments';
import { errorMessage } from '@/shared/api/errorMessage';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { InstrumentRow } from '../components/InstrumentRow';
import type { Instrument } from '../schema';
import { useInstruments } from '../useInstruments';

interface Props {
  /** Se llama al tocar un instrumento (de la lista o de la búsqueda). */
  onSelect: (instrument: Instrument) => void;
}

export function InstrumentsScreen({ onSelect }: Props) {
  const { colors, spacing, fontSize } = useTheme();

  const [text, setText] = useState('');
  const query = useDebouncedValue(text, SEARCH_DEBOUNCE_MS).trim();
  const isSearching = text.trim().length > 0;

  // Con el campo vacío se ve la lista completa; si no, el resultado de /search.
  const list = useInstruments();
  const search = useSearchInstruments(query);
  const { data, isPending, isError, error, refetch, isRefetching } = isSearching ? search : list;

  const emptyMessage = isSearching
    ? `No encontramos instrumentos con "${query}".`
    : 'No hay instrumentos para mostrar.';

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

      <SearchBar value={text} onChangeText={setText} />

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
          renderItem={({ item }) => <InstrumentRow instrument={item} onPress={onSelect} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, padding: spacing.xl, textAlign: 'center' }}>
              {emptyMessage}
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
