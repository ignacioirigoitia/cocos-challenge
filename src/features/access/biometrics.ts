import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricResult = 'success' | 'failed' | 'unavailable';

// Errores que significan "este dispositivo no puede hacer biometría" (no que la persona falló):
// en esos casos no se la deja bloqueada afuera de su propia app.
const CANNOT_ASK = [
  'not_available',
  'not_enrolled',
  'passcode_not_set',
  'missing_usage_description',
];

/**
 * ¿Se puede pedir biometría? Solo si el dispositivo tiene Face ID o huella y está configurada.
 * En Expo Go de iOS no: Face ID no está soportado ahí (hace falta una development build).
 * Ante cualquier falla del módulo, falso: el candado es una capa extra y no debe trabar la app.
 */
export async function biometricsAvailable(): Promise<boolean> {
  if (
    Platform.OS === 'ios' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return false;
  }
  try {
    return (
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync())
    );
  } catch {
    return false;
  }
}

/**
 * Pide la biometría. 'failed' si la persona la canceló o no coincidió (se puede reintentar);
 * 'unavailable' si el dispositivo no puede hacerlo.
 */
export async function askBiometrics(): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá que sos vos para entrar',
      cancelLabel: 'Cancelar',
      // Solo biometría: la app se pide a sí misma el Face ID o la huella, no el código del teléfono.
      disableDeviceFallback: true,
    });
    if (result.success) return 'success';
    return CANNOT_ASK.includes(result.error) ? 'unavailable' : 'failed';
  } catch {
    return 'unavailable';
  }
}
