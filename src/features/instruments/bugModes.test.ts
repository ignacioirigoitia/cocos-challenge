import { formatARS, formatPct } from '@/shared/money/money';

import easy from './__fixtures__/instruments.easy.json';
import hard from './__fixtures__/instruments.hard.json';
import medium from './__fixtures__/instruments.medium.json';
import off from './__fixtures__/instruments.off.json';
import { InstrumentsResponseSchema } from './schema';

// Respuestas reales de GET /instruments grabadas con cada valor de X-Enable-Bugs.
const withBugs = { easy, medium, hard };

describe('/instruments con X-Enable-Bugs: off (camino feliz)', () => {
  const instruments = InstrumentsResponseSchema.parse(off);

  it('trae los 25 instrumentos (sin la moneda ARS), todos con precio y operables', () => {
    expect(instruments).toHaveLength(25);
    expect(instruments.some((i) => i.ticker === 'ARS')).toBe(false);
    expect(instruments.every((i) => i.tradable && i.lastPrice && i.returnPct)).toBe(true);
  });
});

describe.each(Object.entries(withBugs))('/instruments con X-Enable-Bugs: %s', (_mode, fixture) => {
  const instruments = InstrumentsResponseSchema.parse(fixture);
  const reference = InstrumentsResponseSchema.parse(off);

  it('la respuesta sigue siendo válida: los defectos no rompen el esquema', () => {
    expect(instruments).toHaveLength(25);
  });

  it('MIRG llega con last_price 0 y queda sin precio, sin retorno y no operable', () => {
    const mirg = instruments.find((i) => i.ticker === 'MIRG');

    expect(mirg?.lastPrice).toBeNull();
    expect(mirg?.returnPct).toBeNull();
    expect(mirg?.tradable).toBe(false);
  });

  it('todos los demás instrumentos quedan igual que en el camino feliz', () => {
    const others = (list: typeof instruments) =>
      list.filter((i) => i.ticker !== 'MIRG').map((i) => [i.ticker, i.lastPrice?.toString()]);

    expect(others(instruments)).toEqual(others(reference));
  });

  it('nunca se muestra un número falso (NaN, Infinity o -100%) en pantalla', () => {
    const shown = instruments.flatMap((i) => [formatARS(i.lastPrice), formatPct(i.returnPct)]);

    expect(shown.some((text) => /NaN|Infinity|-100,00%/.test(text))).toBe(false);
  });
});
