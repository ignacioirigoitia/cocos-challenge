import real from './__fixtures__/portfolio.real.json';
import { PortfolioResponseSchema } from './schema';

const garo = {
  instrument_id: 16,
  ticker: 'GARO',
  quantity: 1,
  last_price: 27.12,
  close_price: 24.44,
  avg_cost_price: 27.12,
};

// Casos armados a mano (no son respuestas reales de la API).
const portfolioWith = (holding: object, cash: unknown = 1000) => ({ cash, holdings: [holding] });

describe('PortfolioResponseSchema', () => {
  it('parsea la respuesta real: efectivo y una posición con sus cálculos', () => {
    const { cash, holdings } = PortfolioResponseSchema.parse(real);

    expect(cash.toString()).toBe('999972.88');
    expect(holdings).toHaveLength(1);
    expect(holdings[0].ticker).toBe('GARO');
    expect(holdings[0].quantity.toString()).toBe('1');
    expect(holdings[0].marketValue?.toString()).toBe('27.12');
    expect(holdings[0].gain?.toString()).toBe('0');
    expect(holdings[0].returnPct?.toString()).toBe('0');
  });

  it('calcula ganancia y rendimiento con el costo promedio', () => {
    const { holdings } = PortfolioResponseSchema.parse(
      portfolioWith({ ...garo, quantity: 10, last_price: 27.12, avg_cost_price: 25 }),
    );

    expect(holdings[0].marketValue?.toString()).toBe('271.2');
    expect(holdings[0].gain?.toString()).toBe('21.2');
    expect(holdings[0].returnPct?.round(2).toString()).toBe('8.48');
  });

  it('una posición con last_price en 0 queda sin valor, sin ganancia y sin rendimiento', () => {
    const { holdings } = PortfolioResponseSchema.parse(portfolioWith({ ...garo, last_price: 0 }));

    expect(holdings[0].lastPrice).toBeNull();
    expect(holdings[0].marketValue).toBeNull();
    expect(holdings[0].gain).toBeNull();
    expect(holdings[0].returnPct).toBeNull();
    expect(holdings[0].quantity.toString()).toBe('1'); // la tenencia se sigue mostrando
  });

  it('acepta un portfolio sin posiciones y con efectivo en 0', () => {
    const { cash, holdings } = PortfolioResponseSchema.parse({ cash: 0, holdings: [] });

    expect(cash.toString()).toBe('0');
    expect(holdings).toEqual([]);
  });

  it.each([
    ['sin ticker', { ...garo, ticker: undefined }],
    ['cantidad con decimales', { ...garo, quantity: 1.5 }],
    ['cantidad en 0', { ...garo, quantity: 0 }],
    ['cantidad negativa', { ...garo, quantity: -2 }],
    ['cantidad como texto', { ...garo, quantity: 'dos' }],
  ])('rechaza la respuesta si una posición viene %s', (_name, holding) => {
    expect(PortfolioResponseSchema.safeParse(portfolioWith(holding)).success).toBe(false);
  });

  it.each([null, -5, 'abc', undefined])('rechaza la respuesta si el efectivo es %p', (cash) => {
    expect(PortfolioResponseSchema.safeParse({ cash, holdings: [] }).success).toBe(false);
  });

  it('rechaza una respuesta que no tiene la forma esperada', () => {
    expect(PortfolioResponseSchema.safeParse([]).success).toBe(false);
    expect(PortfolioResponseSchema.safeParse({ cash: 1 }).success).toBe(false);
  });
});
