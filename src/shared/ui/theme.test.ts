import { palettes, resolveScheme } from './theme';

describe('resolveScheme', () => {
  it('respeta la elección explícita del usuario', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  it('con "system" sigue al sistema', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('con "system" y sin dato del sistema usa claro', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});

describe('palettes', () => {
  it('claro y oscuro definen los mismos colores', () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });
});
