import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useSettings } from '@/shared/store/settings';
import { useSettingsHydrated } from '@/shared/store/useSettingsHydrated';

import { askBiometrics, biometricsAvailable } from '../biometrics';
import { useAccess } from '../useAccess';
import { AccessScreen } from './AccessScreen';

jest.mock('../biometrics');
jest.mock('@/shared/store/useSettingsHydrated');

const initialSettings = useSettings.getState();
const available = biometricsAvailable as jest.Mock;
const ask = askBiometrics as jest.Mock;
const hydrated = useSettingsHydrated as jest.Mock;

beforeEach(() => {
  useSettings.setState({ ...initialSettings, accountCreated: true }, true);
  useAccess.setState({ unlocked: false });
  hydrated.mockReturnValue(true);
  available.mockResolvedValue(true);
  ask.mockResolvedValue('success');
});
afterEach(() => jest.clearAllMocks());

const isUnlocked = () => useAccess.getState().unlocked;

describe('AccessScreen: sin cuenta (primer uso)', () => {
  beforeEach(() => useSettings.setState({ accountCreated: false }));

  it('explica que hay una cuenta por dispositivo y ofrece crearla', async () => {
    await render(<AccessScreen />);

    expect(screen.getByRole('header', { name: 'Bienvenido' })).toBeOnTheScreen();
    expect(screen.getByText(/una sola cuenta por dispositivo/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeOnTheScreen();
  });

  it('no deja entrar ni pide biometría hasta que la persona crea la cuenta', async () => {
    await render(<AccessScreen />);

    expect(isUnlocked()).toBe(false);
    expect(available).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });

  it('al crear la cuenta la deja guardada y entra, sin pedir biometría en ese mismo momento', async () => {
    await render(<AccessScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    expect(useSettings.getState().accountCreated).toBe(true);
    expect(isUnlocked()).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });
});

describe('AccessScreen: con cuenta', () => {
  it('si el dispositivo no tiene biometría disponible entra directo', async () => {
    available.mockResolvedValue(false);

    await render(<AccessScreen />);

    await waitFor(() => expect(isUnlocked()).toBe(true));
    expect(ask).not.toHaveBeenCalled();
  });

  it('con biometría la pide apenas se abre y, si coincide, entra', async () => {
    await render(<AccessScreen />);

    await waitFor(() => expect(isUnlocked()).toBe(true));
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('mientras espera la respuesta muestra el bloqueo y no deja entrar', async () => {
    let answer: (value: string) => void = () => undefined;
    ask.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    await render(<AccessScreen />);

    expect(await screen.findByRole('header', { name: 'App bloqueada' })).toBeOnTheScreen();
    expect(isUnlocked()).toBe(false);

    await act(async () => answer('success'));
    expect(isUnlocked()).toBe(true);
  });

  it('si no coincide sigue bloqueada, lo dice y permite reintentar', async () => {
    ask.mockResolvedValueOnce('failed');
    await render(<AccessScreen />);

    expect(
      await screen.findByText('No pudimos verificar tu identidad. Probá de nuevo.'),
    ).toBeOnTheScreen();
    expect(isUnlocked()).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Desbloquear' }));

    await waitFor(() => expect(isUnlocked()).toBe(true));
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it('si el dispositivo resulta no poder hacerlo (unavailable) no la deja afuera', async () => {
    ask.mockResolvedValue('unavailable');

    await render(<AccessScreen />);

    await waitFor(() => expect(isUnlocked()).toBe(true));
  });

  it('no muestra la bienvenida a quien ya tiene cuenta', async () => {
    await render(<AccessScreen />);

    expect(screen.queryByRole('button', { name: 'Crear mi cuenta' })).not.toBeOnTheScreen();
  });
});

describe('AccessScreen: mientras carga lo guardado', () => {
  it('no muestra la bienvenida ni decide nada: quien ya tiene cuenta no la vería ni un instante', async () => {
    hydrated.mockReturnValue(false);
    useSettings.setState({ accountCreated: false });

    await render(<AccessScreen />);

    expect(screen.queryByText('Bienvenido')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
    expect(available).not.toHaveBeenCalled();
    expect(isUnlocked()).toBe(false);
  });
});
