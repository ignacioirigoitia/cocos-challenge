import * as RootLayout from '@/app/_layout';
import { AppErrorFallback } from '@/shared/ui/AppErrorFallback';

// Este archivo no vive en src/app a propósito: ahí Expo Router lo trataría como una pantalla.
describe('layout raíz', () => {
  it('exporta el aviso de error como límite global: si algo inesperado rompe una pantalla, no queda en blanco', () => {
    expect(RootLayout.ErrorBoundary).toBe(AppErrorFallback);
  });
});
