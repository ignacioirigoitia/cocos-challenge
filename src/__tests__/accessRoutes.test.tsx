import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import { useAccess } from '@/features/access/useAccess';
import { AccessScreen } from '@/features/access/screens/AccessScreen';
import { useSettings } from '@/shared/store/settings';

jest.mock('@/features/access/biometrics', () => ({
  biometricsAvailable: jest.fn().mockResolvedValue(false),
  askBiometrics: jest.fn().mockResolvedValue('success'),
}));

const initialSettings = useSettings.getState();
const mounted = jest.fn();
function Tabs() {
  mounted();
  return <Text>pantallas de la app</Text>;
}

const routes = {
  _layout: RootLayout,
  access: AccessScreen,
  '(tabs)/index': Tabs,
  order: Tabs, // la orden también es una pantalla de la app
};

beforeEach(() => {
  mounted.mockClear();
  useAccess.setState({ unlocked: false });
  useSettings.setState({ ...initialSettings, accountCreated: false }, true);
});

describe('control de acceso en las rutas', () => {
  it('sin cuenta, la app arranca en la bienvenida y las pantallas de la app no se montan', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    expect(await screen.findByText('Bienvenido')).toBeOnTheScreen();
    expect(screen.queryByText('pantallas de la app')).not.toBeOnTheScreen();
    expect(mounted).not.toHaveBeenCalled();
  });

  it('un link directo a una pantalla de la app tampoco se salta el control', async () => {
    await renderRouter(routes, { initialUrl: '/order' });

    expect(await screen.findByText('Bienvenido')).toBeOnTheScreen();
    expect(mounted).not.toHaveBeenCalled();
  });

  it('al crear la cuenta pasa a las pantallas de la app', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    await fireEvent.press(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    expect(await screen.findByText('pantallas de la app')).toBeOnTheScreen();
  });

  it('con cuenta y sin biometría disponible entra directo', async () => {
    useSettings.setState({ accountCreated: true });

    await renderRouter(routes, { initialUrl: '/' });

    expect(await screen.findByText('pantallas de la app')).toBeOnTheScreen();
  });
});
