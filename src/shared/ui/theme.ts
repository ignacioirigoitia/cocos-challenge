import { useColorScheme } from 'react-native';

import { type ThemePreference, useSettings } from '@/shared/store/settings';

export type Scheme = 'light' | 'dark';

// Estilo minimalista tipo Robinhood: fondo limpio, poco color, el foco en los números.
export const palettes = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F6F7',
    text: '#0B0B0C',
    textSecondary: '#6B7280',
    border: '#ECEEF0',
    positive: '#00875A',
    negative: '#D6333B',
  },
  dark: {
    background: '#000000',
    surface: '#15171A',
    text: '#F5F6F7',
    textSecondary: '#9CA3AF',
    border: '#23262B',
    positive: '#2DD48A',
    negative: '#FF6B6B',
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const fontSize = { sm: 12, md: 14, lg: 16, title: 28 } as const;

export function resolveScheme(
  preference: ThemePreference,
  system: Scheme | null | undefined,
): Scheme {
  if (preference !== 'system') return preference;
  return system ?? 'light';
}

export function useTheme() {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();
  const scheme = resolveScheme(preference, system);
  return { scheme, colors: palettes[scheme], spacing, fontSize };
}
