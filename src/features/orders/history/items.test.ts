import instrumentsOff from '@/features/instruments/__fixtures__/instruments.off.json';
import { InstrumentsResponseSchema } from '@/features/instruments/schema';

import hardOrders from '../__fixtures__/orders.hard.json';
import offOrders from '../__fixtures__/orders.off.json';
import { toHistoryItems } from './items';
import { OrdersResponseSchema } from './schema';

const instruments = InstrumentsResponseSchema.parse(instrumentsOff);
const parse = (orders: unknown) => OrdersResponseSchema.parse(orders);
const base = offOrders[0];

describe('toHistoryItems', () => {
  it('ordena de la más nueva a la más vieja, venga como venga de la API', () => {
    // off las manda de la más vieja a la más nueva; hard las manda desordenadas.
    const fromOff = toHistoryItems(parse(offOrders), instruments).map((i) => i.id);
    const fromHard = toHistoryItems(parse(hardOrders), instruments).map((i) => i.id);

    expect(fromOff).toEqual([224926, 147106]);
    expect(fromHard).toEqual([224926, 147106]);
  });

  it('las órdenes sin fecha van al final', () => {
    const orders = parse([
      { ...base, id: 1, created_at: undefined },
      { ...base, id: 2, created_at: '2026-01-01T00:00:00.000Z' },
      { ...base, id: 3, created_at: '2026-06-01T00:00:00.000Z' },
    ]);

    expect(toHistoryItems(orders, instruments).map((i) => i.id)).toEqual([3, 2, 1]);
  });

  it('con la misma fecha, la de id mayor primero (desempate estable)', () => {
    const same = '2026-01-01T00:00:00.000Z';
    const orders = parse([
      { ...base, id: 10, created_at: same },
      { ...base, id: 30, created_at: same },
      { ...base, id: 20, created_at: same },
    ]);

    expect(toHistoryItems(orders, instruments).map((i) => i.id)).toEqual([30, 20, 10]);
  });

  it('trae el ticker de la lista de instrumentos por id', () => {
    const items = toHistoryItems(parse(offOrders), instruments);

    expect(items.find((i) => i.id === 147106)?.ticker).toBe('GARO');
    expect(items.find((i) => i.id === 224926)?.ticker).toBe('CAPX');
  });

  it('un instrumento que no está en la lista queda sin ticker (null), sin inventar uno', () => {
    const [item] = toHistoryItems(parse([{ ...base, instrument_id: 9999 }]), instruments);

    expect(item.ticker).toBeNull();
  });

  it('no modifica la lista original', () => {
    const orders = parse(hardOrders);
    const before = orders.map((o) => o.id);

    toHistoryItems(orders, instruments);

    expect(orders.map((o) => o.id)).toEqual(before);
  });
});
