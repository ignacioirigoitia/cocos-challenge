import { formatDateTime } from './date';

describe('formatDateTime', () => {
  it('muestra día, mes abreviado, año y hora (en la hora local)', () => {
    expect(formatDateTime(new Date(2026, 10, 1, 3, 6))).toBe('1 nov 2026, 03:06');
  });

  it.each([
    [0, 'ene'],
    [1, 'feb'],
    [2, 'mar'],
    [3, 'abr'],
    [4, 'may'],
    [5, 'jun'],
    [6, 'jul'],
    [7, 'ago'],
    [8, 'sep'],
    [9, 'oct'],
    [10, 'nov'],
    [11, 'dic'],
  ])('el mes %i se abrevia %p', (month, label) => {
    expect(formatDateTime(new Date(2026, month, 15, 12, 0))).toBe(`15 ${label} 2026, 12:00`);
  });

  it('completa con ceros la hora y los minutos, y usa 24 horas', () => {
    expect(formatDateTime(new Date(2026, 0, 9, 0, 5))).toBe('9 ene 2026, 00:05');
    expect(formatDateTime(new Date(2026, 0, 9, 23, 59))).toBe('9 ene 2026, 23:59');
  });

  it('sin fecha muestra "--"', () => {
    expect(formatDateTime(null)).toBe('--');
  });
});
