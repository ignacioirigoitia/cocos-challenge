# Decisiones

> Este archivo lo escribe Ignacio, en sus palabras. Por cada decisión importante: qué elegí, por qué, y qué alternativas descarté.

## Etapa 1. Análisis

Revisé los endpoints de lectura (los GET) que corresponden al challenge y vi que el header X-Enable-Bugs tiene opciones que romperían un camino feliz de la app. Esos defectos vienen bien para tener muy en cuenta las validaciones, sobre todo del formato en que vienen los números y al momento de operarlos. A partir de ahí decidí utilizar la librería big.js para validaciones con precisión decimal, entendiendo que para una app de finanzas esto tiene que ser extremadamente preciso.

Los precios en la API llegan como números JSON, o sea floats. Los convierto a Big apenas entran a la app y nunca opero con floats. La validación del formato la hago al entrar, no confío en que la API mande siempre datos correctos. Si utilizo floats, floor(monto / precio) puede darme una acción menos por un error de binario.

Para buscar por ticker utilizo la query del servidor, no filtro en el front.

Si last_price devuelve 0, entonces muestro "--". Para crear una orden, si el usuario quiere invertir un monto en pesos, hacemos ese monto dividido el last_price, y dividir por 0 rompería todo. Lo mismo en portfolio: si mostramos el valor de una posición (cantidad * precio), daría 0. Así que prefiero mostrar "--" y bloqueamos la operación para crear órdenes. En la lista de portfolio va a estar, para que se sepa que tenemos ese activo, pero sin precio disponible.

Revisando la API vi que tengo el dato de efectivo disponible, me parece algo valioso para mostrar y agregar a las validaciones.

Voy a hacer la app con X-Enable-Bugs en off y luego ir avanzando hasta llegar al que más bugs trae.

## Etapa 2. Diseño

Decidí utilizar 3 tecnologías en relación al manejo de estado: react-hook-form para el formulario de creación de órdenes, React Query para la interacción con el servidor y Zustand para el estado global de la aplicación, que en este caso es el tema claro u oscuro y la configuración de la API. Lo decidí de esta manera para dividir la responsabilidad de cada herramienta y utilizar sus funcionalidades más características para cada caso.

Para la navegación utilizo Expo Router, para aprovechar herramientas de Expo que se integren de buena manera a su entorno. Descarté React Navigation porque tiene más código de configuración y Expo Router ya está construido sobre esa misma librería, así que no me aporta nada extra para esta app.

La estructura de las carpetas la voy a hacer por feature: escala mucho mejor si la aplicación crece. Además, voy a tener una carpeta shared para lo que se utiliza en todas las features.

Decidí hacer los estilos por mi cuenta y no usar alguna librería, para tener más control y no caer en una sobreingeniería, y para quitarle esa UI genérica con la que vienen seteadas.

Para validaciones voy a usar Zod. Lo elegí porque con un solo esquema valido tanto los datos que llegan de la API como los del formulario, y además me genera los tipos de TypeScript sin tener que escribirlos aparte. Descarté escribir las validaciones a mano porque es más código y es fácil olvidarse de algún caso.

Para las peticiones HTTP y el manejo de errores voy a usar fetch con un wrapper fino, y tener una política de errores para todos los endpoints. Elegí fetch y no Axios para no agregar una dependencia, ya que son pocos endpoints y alcanza con un solo lugar donde agregar los headers. No voy a reintentar la creación de una orden si falla por alguna razón, porque ejecutarla dos veces traería un gran problema para el usuario.

Voy a tratar a los endpoints como una API externa que puede limitar o fallar. Por eso busco hacer menos pedidos (debounce en la búsqueda, caché de React Query) y manejo el error 429 respetando el tiempo de espera que indique la API.

En la UI me incliné por la de Robinhood, porque la siento más sencilla de cara al usuario. Descarté la de Coinbase (tarjetas) y la de Binance Lite (oscura y densa) porque quería que el foco estuviera en los números y que funcione bien tanto en modo claro como oscuro.


## Etapa 3. Setup

Preferí utilizar npm en vez de yarn o pnpm porque al tener que ejecutarse en un entorno local, no requiere de una instalación aparte. La plantilla de Expo la creé con lo mínimo necesario para no cargar el contenido de la aplicación ni de herramientas que hasta el momento no vamos a utilizar. Creé un test de precisión para el uso de la librería big.js porque es de las cosas más importantes que vamos a necesitar dentro de la app. El test muestra el caso concreto que me hizo elegirla: con floats, floor(0.58 / 0.01) da 57, y con big.js da 58.

El CI corre los 4 checks básicos que necesitamos para no romper código compartido y seguir una misma línea de código: typecheck (errores de tipos), lint (errores comunes), formato (estilo consistente) y tests (que no se rompa la lógica).

Al armar la plantilla de Expo saqué las dependencias web y el código de ejemplo que traía. También fijé react-dom a la misma versión que react, porque si no npm me tiraba un conflicto de dependencias con expo-router.

## Etapa 4. Features

### Instrumentos

Los precios de un mercado cambian todo el tiempo y el usuario tiene que enterarse casi de inmediato. Pensé en hacer un fetch cada 5 segundos para actualizarlos, pero lo descarté por tres razones. Primero, entra en contradicción con tratar a la API como externa con rate limit: serían 12 pedidos por minuto por cada pantalla abierta, y no sé qué límite tiene. Segundo, esta API devuelve precios fijos, así que el polling no iba a mostrar ningún cambio. Tercero, hacerlo bien (que se pause en segundo plano, que frene ante un error o un 429) agrega bastante complejidad para un resultado que ni se ve.

Por eso dejé las lecturas con un caché de 1 minuto y el pull to refresh para actualizar a mano. Soy consciente de que un precio de hace un minuto es viejo para una app de trading. En un caso real lo resolvería con WebSockets: el servidor manda los cambios apenas ocurren, sin pedidos repetidos, y es la forma correcta para un dato que cambia tan seguido.
