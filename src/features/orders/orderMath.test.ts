import { Big } from 'big.js';

import { estimatedCost, quantityFromAmount } from './orderMath';

const b = (n: string) => new Big(n);

describe('quantityFromAmount', () => {
  it('devuelve la cantidad máxima de acciones enteras que alcanza con el monto', () => {
    expect(quantityFromAmount(b('1000'), b('27.12')).toString()).toBe('36'); // 36,87 -> 36
  });

  it('redondea siempre hacia abajo, aunque quede muy cerca de la siguiente', () => {
    expect(quantityFromAmount(b('99.99'), b('10')).toString()).toBe('9');
  });

  it('es exacta donde los floats fallan (0,3 / 0,1 da 2,9999999999999996 con floats)', () => {
    expect(Math.floor(0.3 / 0.1)).toBe(2);
    expect(quantityFromAmount(b('0.3'), b('0.1')).toString()).toBe('3');
  });

  it('si el monto no alcanza para una acción, la cantidad es 0', () => {
    expect(quantityFromAmount(b('20'), b('27.12')).toString()).toBe('0');
  });

  it('nunca devuelve una cantidad que cueste más que el monto, ni por redondeo de la división', () => {
    // 0,99999999999999999999999 / 1 se redondea a 1 en la división (20 decimales): no alcanza para 1 acción.
    const amount = b('0.99999999999999999999999');
    const quantity = quantityFromAmount(amount, b('1'));

    expect(quantity.toString()).toBe('0');
    expect(estimatedCost(quantity, b('1')).lte(amount)).toBe(true);
  });

  it('un monto exacto de una acción da 1', () => {
    expect(quantityFromAmount(b('27.12'), b('27.12')).toString()).toBe('1');
  });
});

describe('estimatedCost', () => {
  it('multiplica cantidad por precio', () => {
    expect(estimatedCost(b('10'), b('27.12')).toString()).toBe('271.2');
  });

  it('es exacto donde los floats fallan (3 x 0,1)', () => {
    expect(estimatedCost(b('3'), b('0.1')).toString()).toBe('0.3');
  });
});
