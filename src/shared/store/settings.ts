import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type BugMode = 'off' | 'easy' | 'medium' | 'hard';
export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  /** Valor del header X-Enable-Bugs. `off` = comportamiento correcto de la API. */
  bugMode: BugMode;
  /** Valor del header X-Candidate-Id (aísla la cuenta en la API). */
  candidateId: string;
  theme: ThemePreference;
  setBugMode: (mode: BugMode) => void;
  setTheme: (theme: ThemePreference) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      bugMode: 'off',
      candidateId: 'ignacio-irigoitia',
      theme: 'system',
      setBugMode: (bugMode) => set({ bugMode }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo se guardan los valores, no las funciones.
      partialize: ({ bugMode, candidateId, theme }) => ({ bugMode, candidateId, theme }),
    },
  ),
);
