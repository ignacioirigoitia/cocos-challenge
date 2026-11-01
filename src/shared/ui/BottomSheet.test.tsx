import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('muestra su contenido', async () => {
    await render(
      <BottomSheet onClose={jest.fn()}>
        <Text>Contenido de la hoja</Text>
      </BottomSheet>,
    );

    expect(screen.getByText('Contenido de la hoja')).toBeOnTheScreen();
  });

  it('el botón "Cerrar" cierra la hoja', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet onClose={onClose}>
        <Text>x</Text>
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tocar el fondo oscuro también la cierra', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet onClose={onClose}>
        <Text>x</Text>
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByTestId('sheet-scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el fondo no es un botón para lectores de pantalla (ya existe "Cerrar")', async () => {
    await render(
      <BottomSheet onClose={jest.fn()}>
        <Text>x</Text>
      </BottomSheet>,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
