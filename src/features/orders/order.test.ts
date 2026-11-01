import { Big } from 'big.js';

import hardMarketPending from './__fixtures__/order.hard-market-pending.json';
import real from './__fixtures__/order.real.json';
import {
  type OrderRequest,
  OrderResponseSchema,
  responseMatchesRequest,
  toOrderBody,
} from './order';

// Casos armados a mano (no son respuestas reales de la API).
const filled = { ...real };

describe('OrderResponseSchema', () => {
  it('parsea la respuesta real de una compra a mercado ejecutada', () => {
    const order = OrderResponseSchema.parse(real);

    expect(order.id).toBe(147106);
    expect(order.instrumentId).toBe(16);
    expect(order.side).toBe('BUY');
    expect(order.type).toBe('MARKET');
    expect(order.quantity.toString()).toBe('1');
    expect(order.price?.toString()).toBe('27.12');
    expect(order.status).toBe('FILLED');
  });

  it('un estado que no conoce queda como UNKNOWN, sin romper', () => {
    expect(OrderResponseSchema.parse({ ...filled, status: 'CANCELLED' }).status).toBe('UNKNOWN');
  });

  it.each([0, null, undefined, 'abc'])('un precio inválido (%p) queda como null', (price) => {
    expect(OrderResponseSchema.parse({ ...filled, status: 'REJECTED', price }).price).toBeNull();
  });

  it.each([
    ['sin id', { ...filled, id: undefined }],
    ['sin instrument_id', { ...filled, instrument_id: undefined }],
    ['con un side desconocido', { ...filled, side: 'HOLD' }],
    ['con un type desconocido', { ...filled, type: 'STOP' }],
    ['con cantidad decimal', { ...filled, quantity: 1.5 }],
    ['con cantidad en 0', { ...filled, quantity: 0 }],
  ])('rechaza la respuesta %s', (_name, body) => {
    expect(OrderResponseSchema.safeParse(body).success).toBe(false);
  });
});

const marketBuy: OrderRequest = {
  instrumentId: 16,
  side: 'BUY',
  type: 'MARKET',
  quantity: new Big('10'),
};
const limitSell: OrderRequest = {
  instrumentId: 1,
  side: 'SELL',
  type: 'LIMIT',
  quantity: new Big('123'),
  price: new Big('84.5'),
};

describe('toOrderBody', () => {
  it('orden a mercado: no manda precio', () => {
    expect(toOrderBody(marketBuy)).toEqual({
      instrument_id: 16,
      side: 'BUY',
      type: 'MARKET',
      quantity: 10,
    });
  });

  it('orden límite: manda el precio (igual al ejemplo del enunciado)', () => {
    expect(toOrderBody(limitSell)).toEqual({
      instrument_id: 1,
      side: 'SELL',
      type: 'LIMIT',
      quantity: 123,
      price: 84.5,
    });
  });

  it('el JSON conserva los decimales tal cual', () => {
    const body = toOrderBody({ ...limitSell, price: new Big('27.12') });

    expect(JSON.stringify(body)).toContain('"price":27.12');
  });

  it('una orden límite sin precio es un error de programación: no se envía', () => {
    expect(() => toOrderBody({ ...limitSell, price: undefined })).toThrow();
  });
});

describe('responseMatchesRequest', () => {
  const parse = (body: object) => OrderResponseSchema.parse({ ...filled, ...body });

  it('coincide cuando instrumento, lado, tipo y cantidad son los enviados', () => {
    const response = parse({ instrument_id: 16, side: 'BUY', type: 'MARKET', quantity: 10 });

    expect(responseMatchesRequest(marketBuy, response)).toBe(true);
  });

  it('en una orden a mercado el precio puede ser distinto (es el de ejecución)', () => {
    const response = parse({
      instrument_id: 16,
      side: 'BUY',
      type: 'MARKET',
      quantity: 10,
      price: 99,
    });

    expect(responseMatchesRequest(marketBuy, response)).toBe(true);
  });

  it.each([
    ['otra cantidad', { quantity: 11 }],
    ['otro instrumento', { instrument_id: 2 }],
    ['otro lado', { side: 'SELL' }],
    ['otro tipo', { type: 'LIMIT' }],
  ])('no coincide con %s', (_name, change) => {
    const response = parse({
      instrument_id: 16,
      side: 'BUY',
      type: 'MARKET',
      quantity: 10,
      ...change,
    });

    expect(responseMatchesRequest(marketBuy, response)).toBe(false);
  });

  it('en una orden límite el precio sí tiene que ser el enviado', () => {
    const base = { instrument_id: 1, side: 'SELL', type: 'LIMIT', quantity: 123 };

    expect(responseMatchesRequest(limitSell, parse({ ...base, price: 84.5 }))).toBe(true);
    expect(responseMatchesRequest(limitSell, parse({ ...base, price: 85 }))).toBe(false);
  });
});

describe('coherencia entre tipo de orden y estado (contrato del enunciado)', () => {
  it('la respuesta real de hard: una compra a mercado que vuelve PENDING queda como UNKNOWN', () => {
    // En hard, la API devolvió PENDING para una orden a mercado que en realidad ya se había
    // ejecutado (movió el efectivo y las tenencias). Mostrarla como "pendiente" engañaría.
    expect(hardMarketPending.type).toBe('MARKET');
    expect(hardMarketPending.status).toBe('PENDING');
    expect(OrderResponseSchema.parse(hardMarketPending).status).toBe('UNKNOWN');
  });

  it.each([
    ['MARKET', 'FILLED', 'FILLED'],
    ['MARKET', 'REJECTED', 'REJECTED'],
    ['MARKET', 'PENDING', 'UNKNOWN'], // una orden a mercado se ejecuta o se rechaza, no queda en espera
    ['LIMIT', 'PENDING', 'PENDING'],
    ['LIMIT', 'REJECTED', 'REJECTED'],
    ['LIMIT', 'FILLED', 'UNKNOWN'], // una límite nace en espera
  ])('%s con estado %s se interpreta como %s', (type, status, expected) => {
    const body = { ...real, type, status, price: 10 };

    expect(OrderResponseSchema.parse(body).status).toBe(expected);
  });
});
