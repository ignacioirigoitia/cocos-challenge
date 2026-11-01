const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Luminancia relativa según WCAG 2.1. */
function luminance(hex: string): number {
  if (!HEX.test(hex)) throw new Error(`Color inválido: ${JSON.stringify(hex)} (se espera #RRGGBB)`);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre dos colores (de 1 a 21). No depende del orden. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
