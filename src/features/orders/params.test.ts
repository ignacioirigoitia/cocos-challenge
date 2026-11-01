import { OrderParamsSchema } from './params';

const valid = { instrumentId: '16', ticker: 'GARO', name: 'Garovaglio', lastPrice: '27.12' };

describe('OrderParamsSchema', () => {
  it('parsea los parámetros de la ruta', () => {
    const p = OrderParamsSchema.parse(valid);

    expect(p.instrumentId).toBe(16);
    expect(p.ticker).toBe('GARO');
    expect(p.name).toBe('Garovaglio');
    expect(p.lastPrice?.toString()).toBe('27.12');
    expect(p.side).toBe('BUY'); // por defecto
  });

  it('acepta el lado de la operación (ej. vender desde el portfolio)', () => {
    expect(OrderParamsSchema.parse({ ...valid, side: 'SELL' }).side).toBe('SELL');
  });

  it.each([undefined, '', '0', 'abc', '-3'])(
    'un precio ausente o inválido (%p) queda en null: el instrumento no se puede operar',
    (lastPrice) => {
      expect(OrderParamsSchema.parse({ ...valid, lastPrice }).lastPrice).toBeNull();
    },
  );

  it.each([
    ['sin id', { ...valid, instrumentId: undefined }],
    ['con un id no numérico', { ...valid, instrumentId: 'abc' }],
    ['con un id decimal', { ...valid, instrumentId: '1.5' }],
    ['con un id repetido (array)', { ...valid, instrumentId: ['1', '2'] }],
    ['sin ticker', { ...valid, ticker: undefined }],
    ['con ticker vacío', { ...valid, ticker: '' }],
    ['con un lado desconocido', { ...valid, side: 'HOLD' }],
  ])('rechaza los parámetros %s', (_name, params) => {
    expect(OrderParamsSchema.safeParse(params).success).toBe(false);
  });
});
