import { create } from 'zustand';

interface AccessState {
  /** La persona ya pasó el control de acceso en esta apertura de la app. No se guarda a propósito. */
  unlocked: boolean;
  unlock: () => void;
}

export const useAccess = create<AccessState>()((set) => ({
  unlocked: false,
  unlock: () => set({ unlocked: true }),
}));
