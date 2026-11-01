import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppErrorFallback } from './AppErrorFallback';

const globals = globalThis as { __DEV__?: boolean };
const originalDev = globals.__DEV__;
afterEach(() => {
  globals.__DEV__ = originalDev;
});

describe('AppErrorFallback', () => {
  it('avisa que algo salió mal, en lenguaje simple', async () => {
    await render(<AppErrorFallback error={new Error('boom')} retry={jest.fn()} />);

    expect(screen.getByText('Algo salió mal')).toBeOnTheScreen();
    expect(
      screen.getByText('Tuvimos un problema inesperado. Podés intentar de nuevo.'),
    ).toBeOnTheScreen();
  });

  it('"Reintentar" vuelve a dibujar la pantalla', async () => {
    const retry = jest.fn(async () => undefined);
    await render(<AppErrorFallback error={new Error('boom')} retry={retry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('en desarrollo muestra el detalle técnico para depurar', async () => {
    globals.__DEV__ = true;
    await render(<AppErrorFallback error={new Error('detalle técnico')} retry={jest.fn()} />);

    expect(screen.getByText('detalle técnico')).toBeOnTheScreen();
  });

  it('en producción NO muestra el detalle técnico al usuario', async () => {
    globals.__DEV__ = false;
    await render(<AppErrorFallback error={new Error('detalle técnico')} retry={jest.fn()} />);

    expect(screen.queryByText('detalle técnico')).not.toBeOnTheScreen();
  });
});
