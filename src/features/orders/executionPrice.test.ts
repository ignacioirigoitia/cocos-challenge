import { Big } from 'big.js';

import { executionPriceNotice } from './executionPrice';

const b = (n: string) => new Big(n);

describe('executionPriceNotice', () => {
  it('sin diferencia, no hay aviso', () => {
    expect(executionPriceNotice('BUY', b('27.12'), b('27.12'))).toBeNull();
  });

  it('un precio que no se conoce no genera aviso (no hay con qué comparar)', () => {
    expect(executionPriceNotice('BUY', null, b('27.12'))).toBeNull();
  });

  it('el texto trae el precio real, el esperado y la diferencia con signo', () => {
    const notice = executionPriceNotice('SELL', b('24.44'), b('27.12'));

    expect(notice?.text).toBe(
      'Se ejecutó a un precio distinto del que viste en la revisión: $ 24,44 en lugar de $ 27,12 (-9,88%).',
    );
  });

  it('una diferencia positiva lleva +', () => {
    expect(executionPriceNotice('BUY', b('27.5'), b('27.12'))?.text).toContain('(+1,40%)');
  });

  it.each([
    ['BUY', '30', '27.12', true], // compraste más caro
    ['BUY', '24', '27.12', false], // compraste más barato
    ['SELL', '24', '27.12', true], // vendiste más barato
    ['SELL', '30', '27.12', false], // vendiste más caro
  ] as const)(
    '%s ejecutada a %s cuando se esperaba %s: perjudica = %s',
    (side, executed, expected, adverse) => {
      expect(executionPriceNotice(side, b(executed), b(expected))?.adverse).toBe(adverse);
    },
  );
});
