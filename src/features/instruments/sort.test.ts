import { Big } from 'big.js';

import easy from './__fixtures__/instruments.easy.json';
import off from './__fixtures__/instruments.off.json';
import { InstrumentsResponseSchema } from './schema';
import { sortInstruments } from './sort';

const real = InstrumentsResponseSchema.parse(off);
const tickers = (items: { ticker: string }[]) => items.map((i) => i.ticker);

describe('sortInstruments: alfabético', () => {
  it('ordena por ticker', () => {
    expect(tickers(sortInstruments(real, 'alphabetical')).slice(0, 4)).toEqual([
      'ARS',
      'BBAR',
      'BPAT',
      'CAPX',
    ]);
  });

  it('incluye a todos, también a los que no variaron', () => {
    expect(sortInstruments(real, 'alphabetical')).toHaveLength(real.length);
  });
});

describe('sortInstruments: mayores subas (con los datos reales)', () => {
  const gainers = sortInstruments(real, 'gainers');

  it('de la mayor suba a la menor', () => {
    expect(tickers(gainers).slice(0, 4)).toEqual(['PGR', 'CELU', 'GARO', 'SAMI']); // 11,83 / 11,13 / 10,97 / 10,95 %
    const pcts = gainers.map((i) => i.returnPct!.toNumber());
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
  });

  it('solo los que de verdad subieron: no entran los que bajaron ni los que no variaron', () => {
    expect(tickers(gainers)).not.toContain('DYCA'); // bajó
    expect(tickers(gainers)).not.toContain('ARS'); // 0%
    expect(gainers.every((i) => i.returnPct!.gt(0))).toBe(true);
  });
});

describe('sortInstruments: mayores bajas (con los datos reales)', () => {
  it('solo los que de verdad bajaron, de la mayor baja a la menor', () => {
    const losers = sortInstruments(real, 'losers');

    expect(tickers(losers)).toEqual(['DYCA']); // el único con retorno negativo hoy
    expect(losers[0].returnPct!.round(2).toString()).toBe('-8.69');
  });

  it('ordena de lo más negativo a lo menos negativo', () => {
    const mk = (ticker: string, pct: string) => ({ ...real[0], ticker, returnPct: new Big(pct) });

    const sorted = sortInstruments(
      [mk('A', '-1'), mk('B', '-9'), mk('C', '-4'), mk('D', '3')],
      'losers',
    );

    expect(tickers(sorted)).toEqual(['B', 'C', 'A']);
  });
});

describe('sortInstruments: casos borde', () => {
  it('un instrumento sin precio válido (MIRG en easy) no entra en ningún ranking', () => {
    const withBug = InstrumentsResponseSchema.parse(easy);
    const mirg = withBug.find((i) => i.ticker === 'MIRG')!;
    expect(mirg.returnPct).toBeNull(); // precondición: el defecto real de la API

    expect(tickers(sortInstruments(withBug, 'gainers'))).not.toContain('MIRG');
    expect(tickers(sortInstruments(withBug, 'losers'))).not.toContain('MIRG');
    expect(tickers(sortInstruments(withBug, 'alphabetical'))).toContain('MIRG'); // sí en la lista normal
  });

  it('con el mismo retorno, desempata alfabéticamente', () => {
    const mk = (ticker: string) => ({ ...real[0], ticker, returnPct: new Big('5') });

    expect(tickers(sortInstruments([mk('C'), mk('A'), mk('B')], 'gainers'))).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('no modifica la lista original', () => {
    const copy = [...real];

    sortInstruments(real, 'gainers');

    expect(tickers(real)).toEqual(tickers(copy));
  });

  it('una lista vacía da una lista vacía en cualquier modo', () => {
    expect(sortInstruments([], 'gainers')).toEqual([]);
    expect(sortInstruments([], 'losers')).toEqual([]);
    expect(sortInstruments([], 'alphabetical')).toEqual([]);
  });
});
