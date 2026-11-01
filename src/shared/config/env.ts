// Expo reemplaza `process.env.EXPO_PUBLIC_…` por su valor al compilar, y solo si se escribe con
// punto. Por eso la lectura vive en un módulo propio: los tests lo reemplazan en vez de intentar
// cambiar la variable.

/** Id de cuenta fijado desde afuera (depuración o evaluación). Si no hay, se genera uno propio. */
export const ENV_CANDIDATE_ID: string | undefined = process.env.EXPO_PUBLIC_CANDIDATE_ID;
