import { render, screen } from '@testing-library/react-native';

import { Button } from './Button';

const noop = () => undefined;

describe('Button', () => {
  it('tiene aire a los costados del texto: cuando no ocupa todo el ancho no queda pegado al borde', async () => {
    await render(<Button label="Crear mi cuenta" onPress={noop} />);

    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toHaveStyle({
      paddingHorizontal: 24,
    });
  });

  it('el botón secundario también', async () => {
    await render(<Button label="Volver" variant="ghost" onPress={noop} />);

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveStyle({ paddingHorizontal: 24 });
  });

  it('mantiene el alto táctil cómodo', async () => {
    await render(<Button label="Listo" onPress={noop} />);

    expect(screen.getByRole('button', { name: 'Listo' })).toHaveStyle({ minHeight: 48 });
  });
});
