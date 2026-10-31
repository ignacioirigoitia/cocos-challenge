import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSettings } from '@/shared/store/settings';

import { SettingsScreen } from './SettingsScreen';

const initialSettings = useSettings.getState();
const globals = globalThis as { __DEV__?: boolean };
const originalDev = globals.__DEV__;

beforeEach(() => useSettings.setState(initialSettings, true));
afterEach(() => {
  globals.__DEV__ = originalDev;
});

describe('SettingsScreen', () => {
  it('permite elegir el tema y lo guarda en los ajustes', async () => {
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));

    expect(useSettings.getState().theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeSelected();
  });

  it('en desarrollo muestra el selector de modo de bugs, que arranca en off', async () => {
    globals.__DEV__ = true;
    await render(<SettingsScreen />);

    expect(screen.getByRole('radio', { name: 'off' })).toBeSelected();

    await fireEvent.press(screen.getByRole('radio', { name: 'hard' }));

    expect(useSettings.getState().bugMode).toBe('hard');
  });

  it('en producción oculta el selector de modo de bugs', async () => {
    globals.__DEV__ = false;
    await render(<SettingsScreen />);

    expect(screen.queryByRole('radio', { name: 'hard' })).not.toBeOnTheScreen();
    expect(screen.queryByText('Modo de la API')).not.toBeOnTheScreen();
    // el tema sigue disponible
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeOnTheScreen();
  });
});
