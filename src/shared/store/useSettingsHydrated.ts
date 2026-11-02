import { useSyncExternalStore } from 'react';

import { useSettings } from './settings';

/** ¿Ya se cargó lo guardado en el dispositivo? Antes de eso el store tiene los valores por defecto. */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useSettings.persist.onFinishHydration(onChange),
    () => useSettings.persist.hasHydrated(),
  );
}
