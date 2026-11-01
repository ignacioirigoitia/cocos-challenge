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

Los precios los guardo como Big dentro del caché de React Query y no como strings. Así TypeScript no me deja sumar o multiplicar un precio con + o * por error: la regla de no usar floats la garantiza el compilador y no depende de que yo me acuerde. Descarté guardar strings y convertir a Big recién al calcular, porque alguien podría hacer Number(precio) en una pantalla y volver el problema de los floats sin que nada avise. El costo que acepto es que React Query no compara objetos Big en profundidad, entonces cada refetch puede re-renderizar la lista. Con 26 instrumentos no se nota.

Validé la respuesta de forma estricta en lo estructural y tolerante en los precios. Si a un instrumento le falta el ticker o el id, rechazo toda la respuesta como formato inesperado, porque eso significa que no es confiable. Si solo el precio viene mal (0, null o texto), ese instrumento se muestra con "--" y el resto funciona normal, porque es un defecto conocido de la API y la app puede convivir con él. Descarté ignorar solo el instrumento roto y seguir, porque esconde errores de la API que conviene ver.

Las lecturas se reintentan 2 veces ante problemas de red, timeout o error 5xx, pero el POST de una orden nunca se reintenta, y lo dejé fijado con un test. Si el POST falla por red no sé si el servidor llegó a recibirlo, y reintentar podría duplicar una compra o una venta. Prefiero mostrarle el error al usuario y que decida si vuelve a intentar.

El modo de bugs forma parte de la clave del caché. Si no estuviera, al pasar de off a hard la app seguiría mostrando los datos viejos de off y no se vería el efecto del cambio. El selector vive en Ajustes y solo aparece en desarrollo (__DEV__), así no queda expuesto en una build de producción.

Para probar los 4 valores de X-Enable-Bugs guardé las respuestas reales de /instruments de cada modo como datos de prueba. Vi que easy, medium y hard son iguales entre sí y solo cambian a MIRG, que llega con last_price en 0. Los tests verifican que la app muestra "--" y que nunca aparece NaN, Infinity ni -100%. Para asegurarme de que sirven rompí la regla a propósito y vi cómo fallaban 6 tests. También encontré que /search es inconsistente con /instruments en esos modos (devuelve MIRG con su precio normal y la búsqueda de "ars" vuelve vacía), eso lo voy a resolver en la búsqueda.

La barra de pestañas la había armado sin íconos pero no me gustó cómo quedaba, así que sumé @expo/vector-icons.

### Portfolio

Para construir la pantalla necesitaba ver una respuesta real con una posición, pero mi cuenta estaba vacía. Elegí hacer una compra de prueba de 1 acción de GARO en vez de armar el esquema con datos inventados, para no asumir nombres de campos que después no coincidan. La orden la tuve que ejecutar yo, porque el sistema de permisos bloqueó que la hiciera Claude al ser una escritura en un sistema externo. Con eso confirmé la forma real de la respuesta y que el efectivo cierra (1.000.000 menos 27,12).

Cuando una posición no tiene precio, el total del portfolio muestra "--" en vez de sumar solo las que sí tienen. Descarté mostrar un total parcial porque es un número que se puede malinterpretar, y es coherente con la regla del "--" que ya tenía para los instrumentos. El efectivo se muestra siempre aparte, porque ese dato sí es confiable.

El efectivo puede ser 0 de forma legítima, a diferencia de un precio, que si es 0 es un dato roto. Por eso separé el parseo de montos del de precios. Y la cantidad de una posición tiene que ser un entero positivo, si no rechazo la respuesta, mientras que un precio roto solo deja sin valor a esa posición.

### Búsqueda

Puse el buscador arriba de la lista de Mercado y no en una pantalla aparte. Con el campo vacío se ve la lista completa y cuando escribo se ve el resultado de /search, así no hace falta navegar a ningún lado. La búsqueda la hace el servidor, como ya había decidido, y reutilicé las mismas filas y el mismo esquema de validación que la lista.

Para no llamar a la API en cada letra, espero 300 ms después de la última tecla (debounce), cancelo el pedido anterior si ya escribí otra letra, y con el campo vacío no consulto nada. Mientras llega el resultado nuevo se sigue mostrando el anterior, para que la pantalla no parpadee. Es parte de tratar a la API como externa, para hacer menos pedidos.

Probando los modos de X-Enable-Bugs vi que /search y /instruments se contradicen: en easy, medium y hard, /instruments devuelve MIRG con precio 0 pero /search lo devuelve con su precio normal (40,88), y buscar "ars" devuelve una lista vacía cuando en off sí lo encuentra. Decidí mostrar lo que dice cada endpoint, validado por separado, sin mezclar las dos fuentes. Descarté combinarlas para tomar el precio que parezca válido, porque eso es elegir cuál precio es el verdadero sin poder saberlo, y en una app financiera prefiero mostrar "--" antes que un precio que no sé si es correcto. Lo dejé cubierto con un test y documentado como un defecto conocido de la API, y lo voy a incluir en el README.

Al agregar íconos a la búsqueda apareció un problema: @expo/vector-icons necesita expo-asset, que estaba instalado pero escondido dentro de la carpeta de expo, así que Jest no lo encontraba. Lo agregué como dependencia directa. Y en los tests reemplazo los íconos por un componente vacío, porque intentan cargar un archivo de fuente que Jest no tiene. Es solo decoración, no afecta la lógica que se prueba.
### Órdenes (diseño del flujo)

Hice el flujo de la orden en tres pasos: formulario, revisión y resultado. Antes de enviar hay una pantalla de revisión con el resumen de lo que voy a mandar. En una app de inversión enviar una orden por error cuesta plata, y la revisión además es el lugar donde puedo avisar que el precio es estimado y mostrar si cambió. Descarté el envío directo con un solo botón, que es más rápido pero no tiene ninguna red de seguridad.

Al tocar "Revisar orden" vuelvo a traer el precio actual, el efectivo y las tenencias, ignorando el caché, y valido todo de nuevo. El precio que el usuario vio al abrir el modal puede ser viejo, y si ingresa un monto en pesos la cantidad se recalcula con el precio nuevo, así confirma la cantidad exacta que se va a enviar. Si el precio cambió, se lo digo. Si no puedo actualizar los datos, no avanzo. Descarté confirmar con el último dato conocido, porque prefiero no hacerlo antes que mandar una orden con un precio que no sé si sigue vigente.

La cantidad por monto es el monto dividido el último precio, redondeado siempre hacia abajo y sin fracciones, calculado con big.js. El redondeo hacia abajo garantiza que la orden nunca cueste más que el monto. Con un test descubrí que big.js redondea la división a 20 decimales y eso podía darme una acción de más en un caso límite, así que agregué una verificación que lo corrige. Uso el último precio también en las órdenes límite, porque es lo que pide el enunciado. Descarté usar el precio límite en ese caso, que es más intuitivo pero se aparta de la consigna, y lo voy a aclarar en el README.

Para el modal armé una hoja propia en vez de usar la nativa. Probé primero la hoja de iOS que se ajusta al contenido, y con este formulario no se comportó: seguía ocupando casi toda la pantalla y tapaba el título. La mía es una pantalla transparente con una hoja pegada abajo, del alto de su contenido, que anda igual en iOS y Android y se puede probar. La animación de entrada la hago yo, así el fondo oscuro hace un fundido sin moverse y solo la hoja sube. Si animaba la pantalla entera, el fondo oscuro se veía desplazarse junto con ella.

Limito lo que se puede escribir según lo que ya sé. Al vender, el campo no pasa de las acciones que tengo, y al comprar no pasa de lo que alcanza con mi efectivo. El botón de vender está apagado si no tengo el activo, con una nota que explica por qué, y comprar va en verde y vender en rojo. Si el dato ya lo tengo, prefiero no dejar escribir algo imposible en vez de avisarlo después. Igual mantengo la validación al revisar, por si mi cartera cambia entre que abro el modal y que reviso.

Los parámetros que llegan por la ruta no son confiables, así que los valido con Zod. Además, al revisar comparo el ticker del link con el del instrumento real de ese id. 

### Órdenes (robustez frente a la API)

Para probar los 4 valores de X-Enable-Bugs primero hice una ráfaga de unos 110 pedidos en pocos minutos, y la plataforma que aloja la API (Vercel) me bloqueó: empezó a responder un 403 con una página HTML de "Security Checkpoint", no un 429 con JSON como yo esperaba. Eso me confirmó que tenía razón al tratar a la API como externa con rate limit, pero me mostró que la app mostraba "Error HTTP 403", un mensaje que no le sirve a nadie. Ahora lo reconozco como un error propio, "bloqueo temporal", con un mensaje claro. Después repetí las pruebas con 8 a 10 segundos entre pedidos y un freno automático ante cualquier señal de bloqueo, y no me volvió a bloquear.

Al usuario nunca le muestro los estados técnicos de la API (FILLED, PENDING, REJECTED). Los traduzco a mensajes que se entiendan: "Orden ejecutada", "Orden pendiente" y "Orden rechazada". Si llega un estado que no conozco, lo muestro como "Estado inesperado" y le digo que revise su portfolio, en vez de asumir qué pasó con su plata.

Probando con órdenes reales en los 4 modos vi que en hard una compra a mercado volvió como PENDING, cuando según el enunciado una orden a mercado se ejecuta o se rechaza, nunca queda en espera. Y en realidad ya se había ejecutado: me había movido el efectivo y las tenencias. Si la mostraba tal cual, la app le diría al usuario que su orden está esperando cuando ya está hecha. Por eso valido que el estado sea coherente con el tipo de orden (a mercado: ejecutada o rechazada; límite: pendiente o rechazada), y si no lo es la muestro como estado inesperado. Descarté mostrar el estado tal como viene porque en una app financiera prefiero decir "no sé" antes que dar un dato falso.

En hard además las órdenes a mercado se ejecutan al precio de cierre y no al último precio: compré y vendí a 24,44 cuando el precio que yo había visto era 27,12. Ahora, si una orden se ejecutó a un precio distinto del que el usuario vio en la revisión, se lo digo de forma explícita, con el precio real, el esperado y la diferencia en porcentaje. Va en rojo si lo perjudica (comprar más caro o vender más barato) y en gris si lo favorece, pero lo aviso en los dos casos porque lo importante es que sepa que no fue lo que esperaba.

También comparo la orden que devuelve la API con la que envié (instrumento, lado, tipo y cantidad). En las órdenes a mercado no comparo el precio, porque es el de ejecución y puede ser distinto. Si algo no coincide, lo advierto en vez de mostrar el resultado como si nada.

En hard, a veces una posición del portfolio llega sin el campo ticker. Decidí no inventarle un nombre ni mostrarla a medias: la pantalla avisa que hubo un error y ofrece reintentar, y como el defecto es intermitente, normalmente el reintento trae los datos bien. Descarté recuperar el ticker de otro lado o mostrar algo como "Instrumento #16", porque prefiero no mostrar datos que no sé si son correctos.

Una vez un portfolio de hard apareció con una acción de más, como si no contara una venta ya ejecutada. Y a veces hard tarda unos 3 segundos en responder. Lo de la latencia lo tolera el timeout de 10 segundos, y para el error de un POST que tarda más ya tengo el aviso de revisar el portfolio. Las otras dos no las puedo detectar con validaciones de formato: solo se verían recalculando las posiciones desde el historial de órdenes, y eso es mucha complejidad para un defecto de un solo nivel. Las dejé documentadas en api-notes.md como limitaciones conocidas de la API, y las voy a pasar al README.


## Etapa 5. Producción

Agregué un límite global de errores, que era parte de la política de errores que había definido en el diseño. Si algo inesperado rompe una pantalla, la app muestra "Algo salió mal" con un botón para reintentar, en vez de quedarse en blanco.

El historial de órdenes lo hice como una cuarta pestaña, "Órdenes". Descarté ponerlo como una sección dentro de Portfolio, que mezclaba dos listas en una pantalla larga, y como una pantalla escondida detrás de un botón, que nadie iba a encontrar. Siempre ordeno las órdenes en la app, de la más nueva a la más vieja, porque comprobé que la API no garantiza el orden: en off vienen de la más vieja a la más nueva y en easy, medium y hard no están ordenadas por fecha. El ticker lo saco de la lista de instrumentos, que ya está guardada en React Query por la pantalla de Mercado, y como la orden solo trae el id del instrumento, necesito las dos listas. Si falla una de las dos, muestro un error con reintentar y no un historial a medias, y si un instrumento no está en la lista muestro un guion y no un nombre inventado. En el historial una orden límite ejecutada es válida, porque se resolvió con el tiempo, a diferencia de la respuesta de un envío, donde una límite no puede venir ejecutada. Se actualiza solo con el gesto de tirar hacia abajo y cuando envío una orden.
