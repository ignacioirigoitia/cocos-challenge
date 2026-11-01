import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createQueryClient } from '@/shared/api/queryClient';

import { OrderModal } from './OrderModal';

function fakeResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

let client: ReturnType<typeof createQueryClient>;
let onClose: jest.Mock;

beforeEach(() => {
  client = createQueryClient();
  onClose = jest.fn();
  globalThis.fetch = jest.fn(async () =>
    fakeResponse({ cash: 1000, holdings: [] }),
  ) as unknown as typeof fetch;
});

afterEach(() => client.clear());

async function renderModal(params: Record<string, string | string[] | undefined>) {
  await render(
    <QueryClientProvider client={client}>
      <OrderModal rawParams={params} onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe('OrderModal', () => {
  it('con parámetros válidos abre el formulario de la orden', async () => {
    await renderModal({
      instrumentId: '16',
      ticker: 'GARO',
      name: 'Garovaglio',
      lastPrice: '27.12',
    });

    expect(await screen.findByText('Comprar GARO')).toBeOnTheScreen();
    await screen.findByText('Efectivo disponible'); // espera a que termine de cargar
  });

  it('el formulario vive dentro de la hoja: tiene su botón "Cerrar"', async () => {
    await renderModal({
      instrumentId: '16',
      ticker: 'GARO',
      name: 'Garovaglio',
      lastPrice: '27.12',
    });
    await screen.findByText('Efectivo disponible');

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeOnTheScreen();
  });

  it('con parámetros inválidos (ej. un link roto) no abre nada a medias y permite cerrar', async () => {
    await renderModal({ instrumentId: 'abc', ticker: 'GARO' });

    expect(
      screen.getByText('No pudimos abrir la orden. Los datos del instrumento no son válidos.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Revisar orden')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1)); // después de la animación de salida
  });
});
