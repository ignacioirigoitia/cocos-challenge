import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ENV_CANDIDATE_ID } from '@/shared/config/env';

export type BugMode = 'off' | 'easy' | 'medium' | 'hard';
export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  /** Valor del header X-Enable-Bugs. `off` = comportamiento correcto de la API. */
  bugMode: BugMode;
  /** Valor del header X-Candidate-Id (aísla la cuenta en la API): uno propio por instalación. */
  candidateId: string;
  theme: ThemePreference;
  setBugMode: (mode: BugMode) => void;
  setTheme: (theme: ThemePreference) => void;
}

/**
 * Id de cuenta propio de cada instalación ("candidate-" + 12 caracteres). La API aísla las órdenes,
 * el efectivo y las tenencias por este id, así cada persona arranca con su cuenta limpia.
 * No es un dato secreto: solo tiene que ser distinto en cada instalación.
 */
export function createCandidateId(): string {
  const chunk = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `candidate-${chunk()}${chunk()}`;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      bugMode: 'off',
      // La variable de entorno permite fijar el id (depuración o evaluación); si no, uno nuevo.
      candidateId: ENV_CANDIDATE_ID || createCandidateId(),
      theme: 'system',
      setBugMode: (bugMode) => set({ bugMode }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Tras cargar lo guardado se vuelve a guardar: zustand no escribe el estado inicial por sí
      // solo, y sin esto el id generado en el primer arranque se perdería (y cambiaría en cada
      // arranque hasta que se tocara algún ajuste).
      onRehydrateStorage: () => (state) => {
        if (state) useSettings.setState({ candidateId: state.candidateId });
      },
      // Solo se guardan los valores, no las funciones.
      partialize: ({ bugMode, candidateId, theme }) => ({ bugMode, candidateId, theme }),
    },
  ),
);
