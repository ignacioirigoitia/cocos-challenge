export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'rate_limit' | 'blocked' | 'validation';

/** Único tipo de error que lanza la capa de API, para que la UI sepa qué mostrar. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** Solo en rate_limit, si la API informó cuánto esperar (header Retry-After). */
  readonly retryAfterMs?: number;

  constructor(
    kind: ApiErrorKind,
    message: string,
    extra: { status?: number; retryAfterMs?: number } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = extra.status;
    this.retryAfterMs = extra.retryAfterMs;
  }
}
