import { act, renderHook } from '@testing-library/react-native';

import { useSettings } from './settings';
import { useSettingsHydrated } from './useSettingsHydrated';

describe('useSettingsHydrated', () => {
  it('es verdadero una vez cargado lo guardado', async () => {
    await act(async () => {
      await useSettings.persist.rehydrate();
    });

    const { result } = await renderHook(() => useSettingsHydrated());

    expect(result.current).toBe(true);
  });

  it('pasa de falso a verdadero cuando termina de cargar, sin que haga falta volver a abrir la pantalla', async () => {
    const hasHydrated = jest.spyOn(useSettings.persist, 'hasHydrated').mockReturnValue(false);
    const { result } = await renderHook(() => useSettingsHydrated());
    expect(result.current).toBe(false);

    hasHydrated.mockReturnValue(true);
    await act(async () => {
      await useSettings.persist.rehydrate(); // avisa a quien esté escuchando
    });

    expect(result.current).toBe(true);
    hasHydrated.mockRestore();
  });
});
