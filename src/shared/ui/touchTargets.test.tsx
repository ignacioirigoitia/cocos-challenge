import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SearchBar } from '@/features/search/components/SearchBar';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ErrorState } from './ErrorState';
import { SegmentedControl } from './SegmentedControl';

// Tamaño mínimo recomendado para un elemento táctil: 44 pt (Apple HIG y WCAG 2.5.5).
const MIN = 44;
const noop = () => undefined;

const heightOf = (element: { props: { style?: unknown; hitSlop?: unknown } }) => {
  const style = StyleSheet.flatten(element.props.style as never) as { minHeight?: number };
  const slop = typeof element.props.hitSlop === 'number' ? element.props.hitSlop : 0;
  return (style.minHeight ?? 0) + slop * 2; // el área táctil incluye el hitSlop
};

describe('tamaños táctiles', () => {
  it('el botón principal mide al menos 44', async () => {
    await render(<Button label="Enviar" onPress={noop} />);

    expect(heightOf(screen.getByRole('button', { name: 'Enviar' }))).toBeGreaterThanOrEqual(MIN);
  });

  it('las opciones del control segmentado miden al menos 44', async () => {
    await render(
      <SegmentedControl
        label="Lado"
        options={[{ value: 'a', label: 'Uno' }]}
        value="a"
        onChange={noop}
      />,
    );

    expect(heightOf(screen.getByRole('radio', { name: 'Uno' }))).toBeGreaterThanOrEqual(MIN);
  });

  it('"Reintentar" mide al menos 44', async () => {
    await render(<ErrorState message="x" onRetry={noop} />);

    expect(heightOf(screen.getByRole('button', { name: 'Reintentar' }))).toBeGreaterThanOrEqual(
      MIN,
    );
  });

  it('"Cerrar" de la hoja mide al menos 44', async () => {
    await render(
      <BottomSheet onClose={noop}>
        <></>
      </BottomSheet>,
    );

    expect(heightOf(screen.getByRole('button', { name: 'Cerrar' }))).toBeGreaterThanOrEqual(MIN);
  });

  it('borrar la búsqueda tiene un área táctil de al menos 44 (con su hitSlop)', async () => {
    await render(<SearchBar value="dy" onChangeText={noop} />);

    expect(
      heightOf(screen.getByRole('button', { name: 'Borrar búsqueda' })),
    ).toBeGreaterThanOrEqual(MIN);
  });
});

describe('letra grande (accesibilidad de tamaño de texto)', () => {
  it('el campo del buscador puede crecer con la letra: usa un alto mínimo, no fijo', async () => {
    await render(<SearchBar value="" onChangeText={noop} />);
    const input = StyleSheet.flatten(screen.getByLabelText('Buscar por ticker').props.style) as {
      height?: unknown;
      minHeight?: number;
    };

    expect(input.height).toBeUndefined();
    expect(input.minHeight).toBeGreaterThanOrEqual(MIN);
  });
});
