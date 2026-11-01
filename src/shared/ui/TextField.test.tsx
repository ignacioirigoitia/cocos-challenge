import { render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';
import { palettes } from './theme';

describe('TextField', () => {
  it('la línea de abajo usa el color de borde de entrada, bien visible', async () => {
    await render(<TextField label="Cantidad" value="" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Cantidad')).toHaveStyle({
      borderBottomColor: palettes.light.inputBorder,
    });
  });

  it('con un error la línea pasa a rojo y se anuncia el mensaje', async () => {
    await render(<TextField label="Cantidad" value="" onChangeText={jest.fn()} error="Mal" />);

    expect(screen.getByLabelText('Cantidad')).toHaveStyle({
      borderBottomColor: palettes.light.negative,
    });
    expect(screen.getByRole('alert')).toBeOnTheScreen();
  });
});
