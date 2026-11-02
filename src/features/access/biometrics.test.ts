import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { askBiometrics, biometricsAvailable } from './biometrics';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const constants = Constants as { executionEnvironment: string };
const originalOS = Platform.OS;

beforeEach(() => {
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  constants.executionEnvironment = 'standalone';
  Platform.OS = 'ios';
});
afterEach(() => {
  jest.clearAllMocks();
  Platform.OS = originalOS;
});

describe('biometricsAvailable', () => {
  it('es verdadero si el dispositivo tiene Face ID o huella y está configurada', async () => {
    expect(await biometricsAvailable()).toBe(true);
  });

  it('es falso si no hay hardware', async () => {
    auth.hasHardwareAsync.mockResolvedValue(false);

    expect(await biometricsAvailable()).toBe(false);
  });

  it('es falso si hay hardware pero no hay nada configurado (ej. un simulador sin Face ID)', async () => {
    auth.isEnrolledAsync.mockResolvedValue(false);

    expect(await biometricsAvailable()).toBe(false);
  });

  it('en Expo Go de iOS es falso sin ni preguntar: Face ID no está soportado ahí', async () => {
    constants.executionEnvironment = 'storeClient';

    expect(await biometricsAvailable()).toBe(false);
    expect(auth.hasHardwareAsync).not.toHaveBeenCalled();
  });

  it('en Expo Go de Android sí consulta al dispositivo', async () => {
    constants.executionEnvironment = 'storeClient';
    Platform.OS = 'android';

    expect(await biometricsAvailable()).toBe(true);
  });

  it('si el módulo falla, no se bloquea el acceso: es falso', async () => {
    auth.hasHardwareAsync.mockRejectedValue(new Error('boom'));

    expect(await biometricsAvailable()).toBe(false);
  });
});

describe('askBiometrics', () => {
  it('éxito', async () => {
    auth.authenticateAsync.mockResolvedValue({ success: true });

    expect(await askBiometrics()).toBe('success');
  });

  it('pide solo biometría, sin ofrecer el código del dispositivo como salida', async () => {
    auth.authenticateAsync.mockResolvedValue({ success: true });

    await askBiometrics();

    expect(auth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: true }),
    );
  });

  it.each(['user_cancel', 'authentication_failed', 'lockout', 'system_cancel'] as const)(
    'si la persona cancela o falla (%s) sigue bloqueado y puede reintentar',
    async (error) => {
      auth.authenticateAsync.mockResolvedValue({ success: false, error } as never);

      expect(await askBiometrics()).toBe('failed');
    },
  );

  it.each([
    'not_available',
    'not_enrolled',
    'passcode_not_set',
    'missing_usage_description',
  ] as const)(
    'si el dispositivo no puede hacerlo (%s) no deja bloqueada a la persona',
    async (error) => {
      auth.authenticateAsync.mockResolvedValue({ success: false, error } as never);

      expect(await askBiometrics()).toBe('unavailable');
    },
  );

  it('si el módulo falla, no deja bloqueada a la persona', async () => {
    auth.authenticateAsync.mockRejectedValue(new Error('boom'));

    expect(await askBiometrics()).toBe('unavailable');
  });
});
