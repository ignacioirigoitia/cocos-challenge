import type { Big } from 'big.js';

import { parseUserNumber } from '@/shared/money/money';

/**
 * Si lo escrito supera `max`, devuelve el máximo (con coma decimal y `decimals` decimales). Lo que
 * todavía no es un número (vacío, "1,", letras) se deja como está: lo valida el formulario. El
 * máximo se redondea hacia abajo para no permitir nunca de más.
 */
export function clampToMax(text: string, max: Big, decimals: 0 | 2): string {
  const value = parseUserNumber(text);
  if (!value || value.lte(max)) return text;
  return max.round(decimals, 0).toFixed(decimals).replace('.', ',');
}
