import { Big } from 'big.js';

import { createOrderFormSchema, type OrderFormValues } from './formSchema';

const ctx = {
  instrumentId: 16,
  lastPrice: new Big('27.12'),
  cash: new Big('1000'),
  held: new Big('5'),
};
const schema = createOrderFormSchema(ctx);

const values = (change: Partial<OrderFormValues> = {}): OrderFormValues => ({
  side: 'BUY',
  type: 'MARKET',
  mode: 'quantity',
  quantityText: '10',
  amountText: '',
  priceText: '',
  ...change,
});

function errorsOf(change: Partial<OrderFormValues>, schemaToUse = schema) {
  const result = schemaToUse.safeParse(values(change));
  if (result.success) throw new Error('se esperaba un error de validación');
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe('orden válida', () => {
  it('compra a mercado por cantidad: usa el último precio para el costo', () => {
    const r = schema.parse(values());

    expect(r.request).toMatchObject({ instrumentId: 16, side: 'BUY', type: 'MARKET' });
    expect(r.request.quantity.toString()).toBe('10');
    expect(r.request.price).toBeUndefined();
    expect(r.unitPrice.toString()).toBe('27.12');
    expect(r.cost.toString()).toBe('271.2');
  });

  it('por monto: la cantidad es el máximo de acciones enteras', () => {
    const r = schema.parse(values({ mode: 'amount', amountText: '800' }));

    expect(r.request.quantity.toString()).toBe('29'); // 800 / 27,12 = 29,49
    expect(r.cost.toString()).toBe('786.48');
  });

  it('acepta coma decimal en el monto', () => {
    const r = schema.parse(values({ mode: 'amount', amountText: '800,50' }));

    expect(r.request.quantity.toString()).toBe('29');
  });

  it('límite: manda el precio y el costo usa el precio límite', () => {
    const r = schema.parse(values({ type: 'LIMIT', priceText: '25,5' }));

    expect(r.request.price?.toString()).toBe('25.5');
    expect(r.unitPrice.toString()).toBe('25.5');
    expect(r.cost.toString()).toBe('255');
  });

  it('límite por monto: la cantidad sale del ÚLTIMO precio (como pide el enunciado), el costo del límite', () => {
    const r = schema.parse(
      values({ type: 'LIMIT', priceText: '20', mode: 'amount', amountText: '1000' }),
    );

    expect(r.request.quantity.toString()).toBe('36'); // 1000 / 27,12, no 1000 / 20
    expect(r.cost.toString()).toBe('720');
  });

  it('podés gastar justo todo tu efectivo', () => {
    const justo = createOrderFormSchema({ ...ctx, cash: new Big('271.2') });

    expect(justo.safeParse(values()).success).toBe(true);
  });

  it('vender hasta lo que tenés es válido', () => {
    expect(schema.safeParse(values({ side: 'SELL', quantityText: '5' })).success).toBe(true);
  });

  it('solo se valida el campo del modo activo', () => {
    expect(schema.safeParse(values({ mode: 'quantity', amountText: 'basura' })).success).toBe(true);
    expect(
      schema.safeParse(values({ mode: 'amount', amountText: '500', quantityText: 'basura' }))
        .success,
    ).toBe(true);
  });
});

describe('cantidad', () => {
  it.each(['', '0', 'abc', '-3'])('rechaza %p', (quantityText) => {
    expect(errorsOf({ quantityText }).quantityText).toBe('Ingresá una cantidad mayor a 0.');
  });

  it.each(['1,5', '2.5'])('rechaza decimales (%p): no hay fracciones de acción', (quantityText) => {
    expect(errorsOf({ quantityText }).quantityText).toBe(
      'La cantidad tiene que ser un número entero.',
    );
  });

  it('rechaza una cantidad absurdamente grande', () => {
    const rico = createOrderFormSchema({ ...ctx, cash: new Big('1e30') });

    expect(errorsOf({ side: 'BUY', quantityText: '1000000001' }, rico).quantityText).toBe(
      'La cantidad es demasiado grande.',
    );
  });
});

describe('monto en pesos', () => {
  it.each(['', '0', 'abc'])('rechaza %p', (amountText) => {
    expect(errorsOf({ mode: 'amount', amountText }).amountText).toBe('Ingresá un monto mayor a 0.');
  });

  it('avisa si el monto no alcanza para una acción', () => {
    expect(errorsOf({ mode: 'amount', amountText: '20' }).amountText).toBe(
      'El monto no alcanza para 1 acción ($ 27,12).',
    );
  });
});

describe('precio límite', () => {
  it.each(['', '0', 'abc'])('es obligatorio y mayor a 0 (%p)', (priceText) => {
    expect(errorsOf({ type: 'LIMIT', priceText }).priceText).toBe(
      'Ingresá un precio límite mayor a 0, con hasta 2 decimales.',
    );
  });

  it('rechaza más de 2 decimales', () => {
    expect(errorsOf({ type: 'LIMIT', priceText: '84,555' }).priceText).toBe(
      'Ingresá un precio límite mayor a 0, con hasta 2 decimales.',
    );
  });

  it('en una orden a mercado no se pide', () => {
    expect(schema.safeParse(values({ type: 'MARKET', priceText: 'basura' })).success).toBe(true);
  });
});

describe('fondos y tenencias', () => {
  it('compra: no puede costar más que el efectivo', () => {
    expect(errorsOf({ quantityText: '100' }).quantityText).toBe(
      'No tenés efectivo suficiente. Necesitás $ 2.712,00 y tenés $ 1.000,00.',
    );
  });

  it('compra por monto: el error aparece en el campo del monto', () => {
    expect(errorsOf({ mode: 'amount', amountText: '5000' }).amountText).toBe(
      'No tenés efectivo suficiente. Necesitás $ 4.990,08 y tenés $ 1.000,00.',
    );
  });

  it('compra límite: se controla con el precio límite, no con el último precio', () => {
    // 50 x 27,12 = 1356 (no alcanza), pero 50 x 15 = 750 sí
    expect(
      schema.safeParse(values({ type: 'LIMIT', priceText: '15', quantityText: '50' })).success,
    ).toBe(true);
    expect(
      schema.safeParse(values({ type: 'LIMIT', priceText: '25', quantityText: '50' })).success,
    ).toBe(false);
  });

  it('venta: no puede superar lo que tenés', () => {
    expect(errorsOf({ side: 'SELL', quantityText: '6' }).quantityText).toBe(
      'No tenés suficientes acciones. Tenés 5.',
    );
  });

  it('venta sin tenencia: lo dice claro', () => {
    const sinAcciones = createOrderFormSchema({ ...ctx, held: new Big('0') });

    expect(errorsOf({ side: 'SELL', quantityText: '1' }, sinAcciones).quantityText).toBe(
      'No tenés acciones de este instrumento para vender.',
    );
  });

  it('vender no mira el efectivo', () => {
    const sinEfectivo = createOrderFormSchema({ ...ctx, cash: new Big('0') });

    expect(sinEfectivo.safeParse(values({ side: 'SELL', quantityText: '5' })).success).toBe(true);
  });
});
