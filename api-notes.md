# Notas de la API (observadas, NO son parte del enunciado)

Base: `https://dummy-api-topaz.vercel.app`. Requisitos del challenge: ver `challenge.md`.

Origen: pruebas propias con `curl` (solo GET) + el `qa-challenge.md` del mismo repo de Cocos, que **no** forma parte del challenge de Ignacio. Se usa solo como contexto. Lo marcado con (QA) viene de ese documento y no está verificado.

## Headers
- `X-Enable-Bugs: off|easy|medium|hard`. Obligatorio, si no hay 400. `off` = comportamiento correcto; los otros inyectan defectos (QA).
- `X-Candidate-Id: <id>`. Obligatorio en `/portfolio` y `/orders`; aísla el estado por candidato. Id usado: `ignacio-irigoitia`.

## Observado
- `GET /instruments`: array de 26 `{id, ticker, name, type, last_price, close_price}`. `type` = `ACCIONES` (25) o `MONEDA` (1: `ARS`, "Pesos", precios 1/1).
- Con `easy|medium|hard`, `MIRG` viene con `last_price: 0` (con `off`, 40.88). Rompe retorno y cantidad por monto.
- `GET /search?query=`: array de instrumentos. Match por prefijo/ticker, sin distinguir mayúsculas (`dyc`, `DY` → DYCA). **No** busca por nombre (`Dycasa` → `[]`). Query vacía o ausente devuelve todos. Sin resultados → `[]`.
- `GET /portfolio` (cuenta nueva): `{"cash": 1000000, "holdings": []}`. El enunciado dice "listado de activos"; la forma real es objeto con `cash` y `holdings`.
- `GET /orders` (cuenta nueva): `[]`.
- Los errores vienen como `{"error": "..."}` con 400.

## Sin verificar (QA)
- `holdings[]`: `{ticker, quantity, last_price, close_price, avg_cost_price}`.
- `POST /orders` devuelve `id` y `status`. `LIMIT` siempre nace `PENDING` y luego puede pasar a `FILLED`/`REJECTED` de forma aleatoria. Las órdenes reservan saldo.
- `POST /reset` borra la cuenta. **No usarlo ni mandar órdenes de prueba** (decisión de Ignacio).
