import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Big } from 'big.js';

import instrumentsOff from '@/features/instruments/__fixtures__/instruments.off.json';
import { InstrumentsScreen } from '@/features/instruments/screens/InstrumentsScreen';
import hardOrders from '@/features/orders/__fixtures__/orders.hard.json';
import { OrdersResponseSchema } from '@/features/orders/history/schema';
import { OrderScreen } from '@/features/orders/screens/OrderScreen';
import real from '@/features/portfolio/__fixtures__/portfolio.real.json';
import { createQueryClient } from '@/shared/api/queryClient';

// Presupuestos de rendimiento medidos en la etapa 5. Los márgenes son generosos a propósito:
// no buscan micro-optimizar sino avisar si alguien rompe una propiedad importante.

type Bump = (key: string) => void;
const counts: Record<string, number> = {};
(globalThis as unknown as { __bump: Bump }).__bump = (key) => {
  counts[key] = (counts[key] ?? 0) + 1;
};
const take = (key: string) => {
  const n = counts[key] ?? 0;
  counts[key] = 0;
  return n;
};

// Envoltorios que cuentan cuántas veces se dibuja cada pieza (y dibujan lo mismo que siempre).
jest.mock('@/features/instruments/components/InstrumentRow', () => {
  const actual = jest.requireActual('@/features/instruments/components/InstrumentRow');
  return {
    InstrumentRow: (props: unknown) => {
      (globalThis as unknown as { __bump: Bump }).__bump('InstrumentRow');
      return actual.InstrumentRow(props);
    },
  };
});
jest.mock('@/features/orders/components/OrderForm', () => {
  const actual = jest.requireActual('@/features/orders/components/OrderForm');
  return {
    OrderForm: (props: unknown) => {
      (globalThis as unknown as { __bump: Bump }).__bump('OrderForm');
      return actual.OrderForm(props);
    },
  };
});

function fakeResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

let client: ReturnType<typeof createQueryClient>;
const wrap = (ui: React.ReactNode) => (
  <QueryClientProvider client={client}>{ui}</QueryClientProvider>
);

beforeEach(() => {
  client = createQueryClient();
  globalThis.fetch = jest.fn(async (url: string) =>
    fakeResponse(url.endsWith('/portfolio') ? real : instrumentsOff),
  ) as unknown as typeof fetch;
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  client.clear();
});

describe('rendimiento', () => {
  it('Mercado dibuja solo las filas que entran en pantalla: la lista está virtualizada', async () => {
    await render(wrap(<InstrumentsScreen onSelect={() => undefined} />));
    await screen.findByText('DYCA');
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Medido: 10 filas de 26. Si alguien reemplaza la FlatList por un map, esto se dispara.
    expect(take('InstrumentRow')).toBeLessThan(instrumentsOff.length);
  });

  it('escribir en el formulario de la orden dibuja el formulario una vez por tecla', async () => {
    await render(
      wrap(
        <OrderScreen
          params={{
            instrumentId: 16,
            ticker: 'GARO',
            name: 'G',
            lastPrice: new Big('27.12'),
            side: 'BUY',
          }}
          onClose={() => undefined}
        />,
      ),
    );
    await screen.findByText('Efectivo disponible');
    await waitFor(() => expect(client.isFetching()).toBe(0));
    take('OrderForm');

    for (const text of ['1', '12', '123', '1234', '12345']) {
      await fireEvent.changeText(screen.getByLabelText('Cantidad de acciones'), text);
    }

    // Medido: 5 dibujos para 5 teclas. El margen (2 por tecla) cubre cambios menores de React.
    expect(take('OrderForm')).toBeLessThanOrEqual(10);
  });

  it('validar 10.000 órdenes es barato (medido ~30 ms; el límite es 15 veces eso)', () => {
    const orders = Array.from({ length: 10_000 }, (_, i) => ({
      ...hardOrders[i % 2],
      id: i + 1,
      created_at: new Date(2026, 0, 1, 0, 0, i).toISOString(),
    }));

    const start = performance.now();
    OrdersResponseSchema.parse(orders);

    expect(performance.now() - start).toBeLessThan(500);
  });
});
