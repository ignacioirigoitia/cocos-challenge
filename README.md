# Challenge Cocos Capital

App móvil para ver el mercado, armar un portfolio y operar (comprar y vender) contra la API del challenge. Está hecha con React Native, TypeScript y Expo, y la corrí en el simulador de iPhone con Expo Go.

Las decisiones, con sus alternativas descartadas, están en [DECISIONS.md](DECISIONS.md). El enunciado del challenge está [acá](https://github.com/cocos-capital/cocos-challenge/blob/main/react-native-challenge.md).

## Cómo correrla

Hace falta Node con npm y la app **Expo Go** en el celular o un simulador (iOS o Android).

```bash
npm install
npm start
```

Se abre Expo en la terminal: escaneá el QR con Expo Go, o apretá `i` (simulador de iOS) o `a` (emulador de Android).

No necesita configurar nada más. La URL de la API y los headers ya están resueltos en `src/shared/api`.

### Mi cuenta de pruebas

La API aísla el estado (efectivo, tenencias y órdenes) por el header `X-Candidate-Id`. Para que quien la pruebe no arranque con mis órdenes de prueba, cada instalación genera su **propio id** la primera vez que abre la app (`candidate-` + 12 caracteres) y lo guarda. Se ve en Ajustes, en la sección Cuenta, y se puede copiar.

Si se quiere fijar un id a mano, se puede con una variable de entorno antes de arrancar:

```bash
EXPO_PUBLIC_CANDIDATE_ID=mi-cuenta npm start
```

Un id que ya quedó guardado en el dispositivo no se pisa con la variable.

## Qué hace

- **Mercado:** lista de instrumentos con último precio y retorno del día (último precio contra cierre), buscador por ticker y dos filtros rápidos (mayores subas y mayores bajas; sin ninguno activo va en orden alfabético). No incluye la moneda ARS: los pesos son el efectivo de la cuenta y no se operan.
- **Portfolio:** valor total, rendimiento histórico de la cuenta (contra el capital inicial, que se asume en $ 1.000.000 porque es con lo que arranca una cuenta nueva) y efectivo disponible. Debajo, un gráfico de la evolución del valor de la cuenta, el listado "Tus instrumentos" (cantidad, valor de mercado, ganancia en pesos y rendimiento en porcentaje de cada posición) y una torta con la composición de la cartera (cada posición y el efectivo). El gráfico de evolución es una **estimación**: la API no da precios históricos, así que se arma con las órdenes ejecutadas, valuando cada instrumento con el último precio al que se operó, y termina en el total real de hoy.
- **Órdenes:** compra y venta, a mercado o límite, indicando cantidad de acciones o monto en pesos. El flujo es formulario, revisión y resultado. En la revisión se vuelven a pedir precio, efectivo y tenencias para confirmar con datos frescos. También hay un historial de órdenes.
- **Ajustes:** tema claro, oscuro o del sistema, y la cuenta de esta instalación. Solo en desarrollo aparece el selector del modo de bugs de la API (`X-Enable-Bugs`: off, easy, medium, hard).

## Chequeos

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

Los mismos cuatro corren en CI con GitHub Actions (`.github/workflows/ci.yml`). Los tests cubren sobre todo la lógica de dinero (retorno, valor de mercado, ganancia, cantidad por monto), el cliente HTTP y sus errores, y los flujos de cada pantalla con React Native Testing Library.

## Decisiones técnicas (resumen)

El detalle y las alternativas que descarté están en [DECISIONS.md](DECISIONS.md).

- **Dinero con `big.js`, nunca floats.** Convierto a `Big` apenas entra la respuesta. Toda la lógica está en `src/shared/money/`, con funciones puras y tests.
- **Zod al entrar.** Valido las respuestas de la API y el formulario con el mismo enfoque, y no confío en que la API mande siempre datos correctos.
- **Tres herramientas de estado, cada una con su rol:** React Query para los datos del servidor, react-hook-form para el formulario de la orden y Zustand para lo global (tema, cuenta y modo de la API, persistidos).
- **Expo Router** para la navegación, con tabs (Mercado, Portfolio, Órdenes, Ajustes). La orden es un modal con una hoja inferior propia.
- **`fetch` con un wrapper fino** y errores tipados: sin conexión, timeout, HTTP, datos inválidos, límite de pedidos y bloqueo.
- **Las lecturas se reintentan, la orden nunca.** Reintentar un POST podría ejecutar la orden dos veces. Si el resultado de una orden queda dudoso, lo digo y mando a revisar el historial.
- **Trato a la API como un servicio externo que limita:** debounce en la búsqueda, caché de React Query, sin refetch agresivo y botón de envío deshabilitado mientras se manda.
- **Estilos propios** con `StyleSheet`, tokens y un hook `useTheme`, con una dirección visual minimalista tipo Robinhood. Contraste AA verificado con un test.

## Cosas de la API que encontré y cómo las resuelvo

Las respuestas reales que fui guardando están como fixtures en la carpeta `__fixtures__` de cada feature.

- **Precio en 0:** hay un instrumento (MIRG) que con los modos con bugs llega con `last_price: 0`. Muestro "--", no calculo retorno y bloqueo operarlo, pero sigue en la lista. Si falta el precio de alguna posición, el total del portfolio también es "--".
- **Portfolio inconsistente en `hard`:** a veces una posición llega sin `ticker`, y alguna vez apareció una acción de más. Sin ticker muestro un error con reintento y no invento el nombre. El `avg_cost_price` de `hard` además no coincide con el de los otros modos.
- **Órdenes a mercado en `hard`:** a veces vuelven `PENDING` (el contrato dice `FILLED` o `REJECTED`) y se ejecutan al precio de cierre y no al último. Muestro el estado como inesperado, aviso cuando el precio de ejecución es distinto del que se vio y mando a revisar el portfolio.
- **Orden del historial:** `/orders` no viene ordenado por fecha de forma confiable, así que lo ordeno en la app por `created_at`.
- **`/search` vs `/instruments`:** en los modos con bugs no coinciden (por ejemplo `ars` devuelve vacío). Lo dejé documentado, porque no hay forma de arreglarlo del lado del cliente.
- **Latencia ocasional** de unos 3 segundos en `hard`: el timeout de la app es de 10 segundos.
- **Bloqueo de la plataforma:** una ráfaga de unos 110 pedidos hizo que Vercel respondiera 403 con una página HTML, no un 429. Lo trato como un error propio (`blocked`) y no reintento.
- **Ganancia por posición contra rendimiento de la cuenta:** la ganancia de cada posición usa el `avg_cost_price` de la API, que es un promedio ponderado y no se recalcula al vender. Si hubo compras y ventas a precios distintos (en `hard` las órdenes a mercado se ejecutan al cierre), una posición puede mostrar una ganancia que no existió en efectivo. El rendimiento de la cuenta sale del valor total y no tiene ese problema.
- **Cantidad por monto:** se calcula con el último precio visto, también en las órdenes límite.

## Estructura

```
src/
  app/                  rutas finas de Expo Router
  features/
    instruments/        lista de Mercado y orden
    search/             buscador con debounce
    portfolio/
    orders/             formulario, revisión, resultado e historial
    settings/
  shared/
    api/                cliente HTTP, errores, reintentos
    money/              lógica de dinero (big.js)
    store/              Zustand (ajustes persistidos)
    ui/                 tema, componentes comunes, hoja inferior
    sort/ format/ hooks/ config/
```

El alias `@/` apunta a `src/`.

## Stack

React Native, TypeScript, Expo (SDK 58), Expo Router, React Query, Zustand, react-hook-form, Zod, big.js, react-native-svg (los gráficos), Jest y React Native Testing Library. Gestor de paquetes: npm.

## Qué no hice

No agregué biometría ni builds con EAS: no los pide el enunciado y no me aportaban a lo que se evalúa.
