import { orderStatusInfo, parseOrderStatus } from './status';

describe('parseOrderStatus', () => {
  it.each(['FILLED', 'PENDING', 'REJECTED'])('reconoce %s', (status) => {
    expect(parseOrderStatus(status)).toBe(status);
  });

  it.each(['filled', 'CANCELLED', '', null, undefined, 3])(
    'cualquier otro valor (%p) es UNKNOWN: la app no asume qué pasó',
    (value) => {
      expect(parseOrderStatus(value)).toBe('UNKNOWN');
    },
  );
});

describe('orderStatusInfo', () => {
  it('FILLED: ejecutada, con texto según compra o venta', () => {
    const buy = orderStatusInfo('FILLED', 'BUY');
    const sell = orderStatusInfo('FILLED', 'SELL');

    expect(buy.title).toBe('Orden ejecutada');
    expect(buy.tone).toBe('success');
    expect(buy.message).toBe('Tu compra se realizó con éxito.');
    expect(sell.message).toBe('Tu venta se realizó con éxito.');
  });

  it('PENDING: en espera hasta que el mercado alcance el precio', () => {
    const info = orderStatusInfo('PENDING', 'BUY');

    expect(info.title).toBe('Orden pendiente');
    expect(info.tone).toBe('pending');
    expect(info.message).toBe(
      'Tu orden quedó en espera. Se ejecutará cuando el mercado alcance tu precio.',
    );
  });

  it('REJECTED: rechazada, sin inventar un motivo', () => {
    const info = orderStatusInfo('REJECTED', 'SELL');

    expect(info.title).toBe('Orden rechazada');
    expect(info.tone).toBe('error');
    expect(info.message).toBe(
      'El mercado no aceptó tu orden. Revisá tu portfolio e intentá de nuevo.',
    );
  });

  it('UNKNOWN: avisa que hay que verificar en el portfolio', () => {
    const info = orderStatusInfo('UNKNOWN', 'BUY');

    expect(info.title).toBe('Estado desconocido');
    expect(info.tone).toBe('warning');
    expect(info.message).toBe(
      'Recibimos un estado que no reconocemos. Revisá tu portfolio para confirmar qué pasó con tu orden.',
    );
  });

  it('nunca muestra los códigos técnicos al usuario', () => {
    for (const status of ['FILLED', 'PENDING', 'REJECTED', 'UNKNOWN'] as const) {
      const { title, message } = orderStatusInfo(status, 'BUY');
      expect(`${title} ${message}`).not.toMatch(/FILLED|PENDING|REJECTED/);
    }
  });
});
