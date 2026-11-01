import type { Side } from './types';

export type OrderStatus = 'FILLED' | 'PENDING' | 'REJECTED';
export type ParsedStatus = OrderStatus | 'UNKNOWN';
export type StatusTone = 'success' | 'pending' | 'error' | 'warning';

const KNOWN: readonly string[] = ['FILLED', 'PENDING', 'REJECTED'];

/** Lo que no es un estado conocido es UNKNOWN: la app no asume qué pasó con la orden. */
export function parseOrderStatus(value: unknown): ParsedStatus {
  return typeof value === 'string' && KNOWN.includes(value) ? (value as OrderStatus) : 'UNKNOWN';
}

/** Texto para el usuario: nunca se muestran los códigos técnicos de la API. */
export function orderStatusInfo(status: ParsedStatus, side: Side) {
  switch (status) {
    case 'FILLED':
      return {
        tone: 'success' as StatusTone,
        title: 'Orden ejecutada',
        message:
          side === 'BUY' ? 'Tu compra se realizó con éxito.' : 'Tu venta se realizó con éxito.',
      };
    case 'PENDING':
      return {
        tone: 'pending' as StatusTone,
        title: 'Orden pendiente',
        message: 'Tu orden quedó en espera. Se ejecutará cuando el mercado alcance tu precio.',
      };
    case 'REJECTED':
      return {
        tone: 'error' as StatusTone,
        title: 'Orden rechazada',
        message: 'El mercado no aceptó tu orden. Revisá tu portfolio e intentá de nuevo.',
      };
    case 'UNKNOWN':
      return {
        tone: 'warning' as StatusTone,
        title: 'Estado desconocido',
        message:
          'Recibimos un estado que no reconocemos. Revisá tu portfolio para confirmar qué pasó con tu orden.',
      };
  }
}
