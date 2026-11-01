import type { QueryClient } from '@tanstack/react-query';
import { Big } from 'big.js';

import { instrumentsQueryOptions } from '@/features/instruments/useInstruments';
import { portfolioQueryOptions } from '@/features/portfolio/usePortfolio';
import { useSettings } from '@/shared/store/settings';

/**
 * Trae el precio actual del instrumento, el efectivo y las tenencias, ignorando el caché, para
 * validar y confirmar la orden con datos frescos. No existe un GET por id: se busca en la lista
 * (la misma fuente que la pantalla de Mercado). Si algún pedido falla, falla todo: no se avanza.
 */
export async function refreshOrderData(client: QueryClient, instrumentId: number) {
  const { bugMode, candidateId } = useSettings.getState();

  const [instruments, portfolio] = await Promise.all([
    client.fetchQuery({ ...instrumentsQueryOptions(bugMode), staleTime: 0 }),
    client.fetchQuery({ ...portfolioQueryOptions(bugMode, candidateId), staleTime: 0 }),
  ]);

  return {
    /** undefined si el instrumento ya no está en la lista. */
    instrument: instruments.find((i) => i.id === instrumentId),
    cash: portfolio.cash,
    held: portfolio.holdings.find((h) => h.instrumentId === instrumentId)?.quantity ?? new Big(0),
  };
}
