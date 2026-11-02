import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchBar } from '@/features/search/components/SearchBar';
import { SEARCH_DEBOUNCE_MS, useSearchInstruments } from '@/features/search/useSearchInstruments';
import { errorMessage } from '@/shared/api/errorMessage';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useTheme } from '@/shared/ui/theme';

import { InstrumentRow } from '../components/InstrumentRow';
import { SortChips } from '../components/SortChips';
import type { Instrument } from '../schema';
import { type SortMode, sortInstruments } from '../sort';
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

  // Con el campo vacío se ve la lista completa; si no, el resultado de /search. Mientras llega la
  // primera búsqueda se sigue mostrando la lista completa en vez de un spinner: la lista no
  // desaparece al escribir la primera letra.
  const list = useInstruments();
  const search = useSearchInstruments(query);
  const showingSearch = isSearching && !search.isPending;
  const { data, isPending, isError, error, refetch } = showingSearch ? search : list;

  // A–Z por defecto; con un filtro rápido se ve quién subió o bajó más en el día. Se aplica a lo
  // que se esté viendo: la lista completa o los resultados de la búsqueda.
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');
  const sorted = useMemo(() => sortInstruments(data ?? [], sortMode), [data, sortMode]);

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

  // Lista vacía: o la API no devolvió nada, o el orden elegido (subas/bajas) dejó afuera a todos.
  const apiReturnedNothing = (data?.length ?? 0) === 0;
  const verb = sortMode === 'gainers' ? 'subió' : 'bajó';
  const emptyMessage = apiReturnedNothing
    ? showingSearch
      ? `No encontramos instrumentos con "${query}".`
      : 'No hay instrumentos para mostrar.'
    : showingSearch
      ? `Ningún resultado de la búsqueda ${verb} hoy.`
      : `Ningún instrumento ${verb} hoy.`;

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

      <SortChips value={sortMode} onChange={setSortMode} />

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Cargando instrumentos" color={colors.text} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <FlatList
          testID="instruments-list"
          data={sorted}
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
});
