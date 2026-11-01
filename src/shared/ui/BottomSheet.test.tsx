import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

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

  it('el botón "Cerrar" cierra la hoja (después de su animación de salida)', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet onClose={onClose}>
        <Text>x</Text>
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('tocar el fondo oscuro también la cierra', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet onClose={onClose}>
        <Text>x</Text>
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByTestId('sheet-scrim'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('el contenido recibe una función para cerrar con la misma animación', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet onClose={onClose}>
        {(close) => (
          <Pressable accessibilityRole="button" accessibilityLabel="Listo" onPress={close}>
            <Text>Listo</Text>
          </Pressable>
        )}
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('si se pide cerrar varias veces seguidas, cierra una sola vez', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet onClose={onClose}>
        <Text>x</Text>
      </BottomSheet>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    await fireEvent.press(screen.getByTestId('sheet-scrim'));
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 400)); // por si hubiera una segunda llamada tardía
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
