import type { OrderType, Side } from './types';

export type OrderStatus = 'FILLED' | 'PENDING' | 'REJECTED';
export type ParsedStatus = OrderStatus | 'UNKNOWN';
export type StatusTone = 'success' | 'pending' | 'error' | 'warning';

const KNOWN: readonly string[] = ['FILLED', 'PENDING', 'REJECTED'];

/** Lo que no es un estado conocido es UNKNOWN: la app no asume qué pasó con la orden. */
export function parseOrderStatus(value: unknown): ParsedStatus {
  return typeof value === 'string' && KNOWN.includes(value) ? (value as OrderStatus) : 'UNKNOWN';
}

// Estados válidos por tipo, según el enunciado: una orden a mercado se ejecuta o se rechaza; una
// límite nace en espera (o se rechaza).
const ALLOWED: Record<OrderType, readonly ParsedStatus[]> = {
  MARKET: ['FILLED', 'REJECTED'],
  LIMIT: ['PENDING', 'REJECTED'],
};

/**
 * Un estado que no corresponde al tipo de orden (en hard, una orden a mercado que vuelve PENDING
 * aunque ya movió el efectivo) no se muestra como si nada: queda como UNKNOWN.
 */
export function statusForType(type: OrderType, status: ParsedStatus): ParsedStatus {
  return ALLOWED[type].includes(status) ? status : 'UNKNOWN';
}

/**
 * En el historial, una orden límite sí puede figurar como ejecutada (se resolvió con el tiempo);
 * una a mercado sigue sin poder estar en espera.
 */
export function statusForHistory(type: OrderType, status: ParsedStatus): ParsedStatus {
  return type === 'MARKET' ? statusForType('MARKET', status) : status;
}

const LABELS: Record<ParsedStatus, string> = {
  FILLED: 'Ejecutada',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazada',
  UNKNOWN: 'Estado inesperado',
};

/** Etiqueta corta para listas (el texto largo para el resultado está en orderStatusInfo). */
export function orderStatusLabel(status: ParsedStatus): string {
  return LABELS[status];
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
        title: 'Estado inesperado',
        message:
          'Recibimos un estado que no esperábamos para esta orden. Revisá tu portfolio para confirmar qué pasó.',
      };
  }
}
