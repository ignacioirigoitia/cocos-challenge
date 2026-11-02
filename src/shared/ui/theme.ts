import { useColorScheme } from 'react-native';

import { type ThemePreference, useSettings } from '@/shared/store/settings';

export type Scheme = 'light' | 'dark';

// Estilo minimalista tipo Robinhood: fondo limpio, poco color, el foco en los números.
export const palettes = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F6F7',
    text: '#0B0B0C',
    // Un poco más oscuro que #6B7280: sobre el gris del buscador no llegaba a AA (4,47 contra 4,5).
    textSecondary: '#656C79',
    border: '#ECEEF0',
    // Borde de los campos de texto: tiene que distinguirse del fondo (3 a 1), a diferencia de los
    // separadores, que son decorativos.
    inputBorder: '#868D98',
    positive: '#00875A',
    negative: '#D6333B',
  },
  dark: {
    background: '#000000',
    surface: '#15171A',
    text: '#F5F6F7',
    textSecondary: '#9CA3AF',
    border: '#23262B',
    inputBorder: '#5B6370',
    positive: '#2DD48A',
    negative: '#FF6B6B',
  },
} as const;

// Colores de las porciones de la torta de composición. Son los mismos en claro y oscuro: están
// elegidos con una luminosidad intermedia para que se distingan de los dos fondos (test de contraste).
export const sliceColors = [
  '#2F6FED',
  '#C9760A',
  '#8A4FD6',
  '#0F8F82',
  '#D6336C',
  '#6B8E0F',
  '#A0522D',
  '#3B82A0',
] as const;
/** El efectivo siempre va en gris, para que no se confunda con una posición. */
export const cashSliceColor = '#6B7280';

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
