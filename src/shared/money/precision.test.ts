import { Big } from 'big.js';

// Test de caracterización: documenta por qué el dinero se opera con big.js y no con floats.
describe('precisión decimal', () => {
  it('los floats nativos fallan en cuentas simples', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(Math.floor(0.58 / 0.01)).toBe(57); // debería ser 58
  });

  it('big.js da el resultado exacto', () => {
    expect(new Big('0.1').plus('0.2').toString()).toBe('0.3');
    expect(new Big('0.58').div('0.01').round(0, Big.roundDown).toString()).toBe('58');
  });
});
