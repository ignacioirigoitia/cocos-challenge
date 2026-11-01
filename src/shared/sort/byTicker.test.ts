import { sortByTicker } from './byTicker';

const t = (...tickers: string[]) => tickers.map((ticker, i) => ({ ticker, id: i }));
const tickersOf = (items: { ticker: string }[]) => items.map((i) => i.ticker);

describe('sortByTicker', () => {
  it('ordena alfabéticamente', () => {
    expect(tickersOf(sortByTicker(t('MIRG', 'ARS', 'DYCA', 'CAPX')))).toEqual([
      'ARS',
      'CAPX',
      'DYCA',
      'MIRG',
    ]);
  });

  it('tickers con números: se ordenan por texto, sin tratarlos aparte', () => {
    expect(tickersOf(sortByTicker(t('TECO2', 'CECO2', 'TECO', 'CAPX')))).toEqual([
      'CAPX',
      'CECO2',
      'TECO',
      'TECO2',
    ]);
  });

  it('no distingue mayúsculas de minúsculas', () => {
    expect(tickersOf(sortByTicker(t('b', 'A', 'c')))).toEqual(['A', 'b', 'c']);
  });

  it('no modifica la lista original', () => {
    const original = t('B', 'A');

    sortByTicker(original);

    expect(tickersOf(original)).toEqual(['B', 'A']);
  });

  it('con el mismo ticker mantiene el orden original (orden estable)', () => {
    const sorted = sortByTicker([
      { ticker: 'A', id: 1 },
      { ticker: 'A', id: 2 },
      { ticker: 'A', id: 3 },
    ]);

    expect(sorted.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('una lista vacía sigue vacía', () => {
    expect(sortByTicker([])).toEqual([]);
  });
});
