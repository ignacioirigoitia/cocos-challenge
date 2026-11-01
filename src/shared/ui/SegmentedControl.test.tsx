import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedControl } from './SegmentedControl';
import { palettes } from './theme';

const options = [
  { value: 'a', label: 'Uno', activeColor: '#00875A' },
  { value: 'b', label: 'Dos', activeColor: '#D6333B', disabled: true },
  { value: 'c', label: 'Tres' },
] as const;

describe('SegmentedControl', () => {
  it('la opción elegida usa su propio color', async () => {
    await render(
      <SegmentedControl label="Prueba" options={options} value="a" onChange={jest.fn()} />,
    );

    expect(screen.getByRole('radio', { name: 'Uno' })).toHaveStyle({ backgroundColor: '#00875A' });
  });

  it('sin color propio, la opción elegida usa el color por defecto del tema', async () => {
    await render(
      <SegmentedControl label="Prueba" options={options} value="c" onChange={jest.fn()} />,
    );

    expect(screen.getByRole('radio', { name: 'Tres' })).toHaveStyle({
      backgroundColor: palettes.light.text,
    });
  });

  it('una opción deshabilitada no se puede elegir y se anuncia como deshabilitada', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl label="Prueba" options={options} value="a" onChange={onChange} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Dos' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Dos' })).toBeDisabled();
  });

  it('una opción habilitada sí avisa que se eligió', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl label="Prueba" options={options} value="a" onChange={onChange} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Tres' }));

    expect(onChange).toHaveBeenCalledWith('c');
  });
});
