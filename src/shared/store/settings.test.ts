/* eslint-disable @typescript-eslint/no-require-imports -- hace falta volver a cargar el store tras jest.resetModules() */
import { createCandidateId, useSettings } from './settings';

const initial = useSettings.getState();

beforeEach(() => useSettings.setState(initial, true));

describe('useSettings', () => {
  it('arranca con el camino feliz: modo de bugs en off, tema del sistema y el id de la variable de entorno', () => {
    const s = useSettings.getState();

    expect(s.bugMode).toBe('off');
    expect(s.theme).toBe('system');
    expect(s.candidateId).toBe('ignacio-irigoitia');
  });

  it('cambia el modo de bugs', () => {
    useSettings.getState().setBugMode('hard');

    expect(useSettings.getState().bugMode).toBe('hard');
  });

  it('cambia el tema', () => {
    useSettings.getState().setTheme('dark');

    expect(useSettings.getState().theme).toBe('dark');
  });
});

describe('createCandidateId', () => {
  it('arma un id propio y legible', () => {
    expect(createCandidateId()).toMatch(/^candidate-[a-z0-9]{12}$/);
  });

  it('cada llamada da un id distinto: cada instalación tiene su cuenta', () => {
    const ids = new Set(Array.from({ length: 200 }, createCandidateId));

    expect(ids.size).toBe(200);
  });
});

// Carga el store como si fuera un arranque nuevo de la app, con el almacenamiento y el id de
// entorno que se indiquen. Se reinicia el registro de módulos para que no se reutilicen ni el
// reemplazo de jest.setup.js ni el almacenamiento de otros tests, y el almacenamiento se prepara
// ANTES de cargar el store, porque este empieza a leer lo guardado apenas se crea.
async function launch(storedValue: string | null, envId?: string) {
  jest.resetModules();
  jest.doMock('@/shared/config/env', () => ({ ENV_CANDIDATE_ID: envId }));
  const storageModule = require('@react-native-async-storage/async-storage');
  const AsyncStorage = storageModule.default ?? storageModule;
  if (storedValue !== null) await AsyncStorage.setItem('settings', storedValue);

  const { useSettings: store } = require('./settings');
  await store.persist.rehydrate();
  await new Promise((resolve) => setTimeout(resolve, 0)); // deja terminar el guardado
  return {
    id: store.getState().candidateId as string,
    saved: (await AsyncStorage.getItem('settings')) as string | null,
  };
}

describe('cuenta propia por instalación', () => {
  it('en el primer arranque genera un id y lo guarda enseguida (si no, cambiaría en cada arranque)', async () => {
    const first = await launch(null);

    expect(first.id).toMatch(/^candidate-[a-z0-9]{12}$/);
    expect(JSON.parse(first.saved ?? '{}').state.candidateId).toBe(first.id);
  });

  it('en el arranque siguiente conserva el mismo id', async () => {
    const first = await launch(null);

    const second = await launch(first.saved);

    expect(second.id).toBe(first.id);
  });

  it('dos instalaciones distintas tienen cuentas distintas', async () => {
    const a = await launch(null);
    const b = await launch(null);

    expect(a.id).not.toBe(b.id);
  });

  it('la variable de entorno EXPO_PUBLIC_CANDIDATE_ID fuerza un id (útil para depurar o para evaluar)', async () => {
    const forced = await launch(null, 'mi-cuenta');

    expect(forced.id).toBe('mi-cuenta');
  });

  it('un id ya guardado (ej. el de quien desarrolló) no se pisa con el de la variable', async () => {
    const stored = JSON.stringify({
      state: { bugMode: 'off', candidateId: 'ya-guardado', theme: 'system' },
      version: 0,
    });

    const result = await launch(stored, 'otro-id');

    expect(result.id).toBe('ya-guardado');
  });
});
