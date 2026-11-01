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

## Comparación por modo de bugs (solo GET de lectura, 3 pedidos por modo, resultados deterministas)
- `/instruments`: `off` es la línea base. `easy`, `medium` y `hard` son idénticos entre sí y solo difieren en `MIRG` (`last_price: 0`). Las respuestas están grabadas en `src/features/instruments/__fixtures__/`.
- `/search` con `easy|medium|hard`: **no** reproduce el precio 0 de MIRG (devuelve 40.88), así que es inconsistente con `/instruments` en el mismo modo.
- `/search?query=ars` devuelve `[]` con `easy|medium|hard` (con `off` devuelve ARS).
- Búsqueda vacía y las demás queries probadas (`DY`, `MIRG`) coinciden con `off`.
- Los defectos que distinguen un nivel de otro no aparecen en estos GET; probablemente estén en `/portfolio` con posiciones y en `/orders`. Pendiente de verificar al llegar a esas features.

## Prueba con los 4 modos sobre una cuenta con posiciones (solo GET)
- `/portfolio` con `off`, `easy` y `medium`: idéntico y estable (12 pedidos por modo antes del bloqueo).
- `/portfolio` con **`hard`: a veces una posición llega SIN el campo `ticker`** (intermitente: de dos pedidos seguidos, uno vino así). Fixture real: `src/features/portfolio/__fixtures__/portfolio.hard-sin-ticker.json`. El resto de los campos viene bien.
- `/orders`: con `off` las órdenes vienen de la más vieja a la más nueva; con `easy`, `medium` y `hard`, de la más nueva a la más vieja. El orden **no es confiable entre modos**: ordenar siempre en el cliente por `created_at`. Fixtures: `src/features/orders/__fixtures__/orders.{off,hard}.json`.
- `/instruments` y `/search`: ver más arriba (MIRG con precio 0; `/search` inconsistente).
- Los defectos de `POST /orders` en `easy`/`medium`/`hard` siguen **sin probar** (requiere mandar órdenes reales a la cuenta).

## Bloqueo de la plataforma (límite de pedidos real)
- Tras ~110 pedidos en pocos minutos desde una misma red, la API respondió **403 con una página HTML "Vercel Security Checkpoint"** (no un 429, sin JSON, sin `Retry-After`). El bloqueo duró al menos varios minutos y alcanzó a todos los endpoints, también con `off`.
- La app lo trata como un error propio (`blocked`): mensaje claro, sin reintentos automáticos (reintentar lo alargaría) y, en una orden, sin la duda de si llegó (el pedido nunca llegó a la API).

## Verificado con una compra real (1 x GARO, MARKET, modo off)
- `POST /orders` → `{id, candidate_id, instrument_id, side, type, quantity, price, status, created_at}`. En una orden `MARKET` el `price` devuelto es el precio de ejecución (27.12 = último precio). Estado `FILLED`.
- `GET /portfolio` → `{cash, holdings: [{instrument_id, ticker, quantity, last_price, close_price, avg_cost_price}]}`. `cash` descuenta lo comprado (1.000.000 - 27,12 = 999972.88).
- `GET /orders` → array de órdenes con la misma forma que la respuesta del POST.
- Fixture real: `src/features/portfolio/__fixtures__/portfolio.real.json`.

## Sin verificar (QA)
- `LIMIT` siempre nace `PENDING` y luego puede pasar a `FILLED`/`REJECTED` de forma aleatoria. Las órdenes reservan saldo.
- `POST /reset` borra la cuenta. Una sola orden de prueba fue autorizada por Ignacio; no se mandan más sin su permiso.
