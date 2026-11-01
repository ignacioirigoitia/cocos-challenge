# Challenge técnico Cocos Capital (React Native)

## Objetivo
App de trading en React Native para el proceso de selección de Cocos Capital. Consume los 4 endpoints del repo del challenge. Enunciado: https://github.com/cocos-capital/cocos-challenge/blob/main/react-native-challenge.md

Entregable: link al repo, ejecutable localmente. Se valora calidad por sobre velocidad.

Lo que evalúan es **cómo piensa Ignacio**: las decisiones que toma y el camino que hace. Se puede usar IA, pero el proyecto tiene que ser suyo y él tiene que poder defender cada decisión en la llamada con el equipo.

## Forma de trabajar
- Idioma: español rioplatense, siempre.
- **Ignacio decide, Claude propone.** Ante cualquier decisión relevante (arquitectura, librerías, estructura, patrones), presentar 2 o 3 opciones con pros y contras y una recomendación. No avanzar sin su elección.
- Trabajamos **por etapas**. No empezar una etapa sin cerrar la anterior ni sin su visto bueno.
- No escribir código de producto, ni instalar dependencias, ni scaffolding hasta que el plan de la etapa esté aprobado.
- Stack obligatorio (ya decidido por Ignacio): React Native, TypeScript, Expo, Zustand, React Query, Jest. El resto de librerías se elige por etapa, con opciones.
- El enunciado completo está en `challenge.md`: es la fuente de verdad de los requisitos.
- Soluciones simples y legibles. Nada de abstracciones ni features que el challenge no pida.
- Todo código no trivial deja un chequeo mínimo que falle si la lógica se rompe.

## DECISIONS.md
- Es el registro de decisiones de Ignacio, en sus palabras. **Claude nunca lo escribe ni lo completa.**
- Al cerrar cada etapa, Claude lo entrevista: qué decisiones importantes se tomaron, por qué, qué alternativas se descartaron. Ignacio responde y lo escribe él.
- Excepciones, solo si Ignacio lo pide expresamente: transcribir texto que él escribió, o redactar con su voz lo que él indique. En ambos casos él lo revisa y tiene que poder defenderlo.
- Claude puede señalar si una justificación quedó floja o falta una decisión, pero no redactar el contenido.

## Arquitectura acordada (etapa 2)
- **Estado:** React Query (datos del servidor), react-hook-form (formulario de orden, valores como string), Zustand (global: tema claro/oscuro, configuración de API: `X-Candidate-Id` y modo `X-Enable-Bugs`, persistidos).
- **Dinero:** todo con `big.js`, nunca floats. Se convierte a `Big` apenas entra la respuesta. Lógica centralizada en `src/shared/money/` (funciones puras con tests).
- **Validación:** Zod en las respuestas de la API (al entrar) y en el formulario (resolver de react-hook-form). `last_price` en 0 = "sin precio": se muestra "--" y se bloquea operar; el instrumento sigue en la lista.
- **Navegación:** Expo Router. Tabs: Mercado (con búsqueda), Portfolio, Ajustes. La orden es una ruta `transparentModal` con una hoja propia (`BottomSheet`) pegada abajo y con el alto de su contenido. Se probó la hoja nativa (`formSheet` + `fitToContents`) y no se ajustaba al contenido, por eso se hizo propia.
- **Carpetas:** `src/app/` solo rutas finas (Expo Router con carpeta `src`); `src/features/{instruments,portfolio,search,orders}` y `src/shared/{api,money,store,ui}`. Se crean con su primer archivo, sin carpetas vacías. Alias `@/` = `src/`.
- **Estilos:** `StyleSheet` nativo con tokens propios y hook `useTheme`. Dirección visual: minimalista tipo Robinhood (fondo limpio, sin cajas, foco en números y verde/rojo).
- **HTTP:** `fetch` con wrapper fino en `shared/api` (headers, timeout, Zod). Errores tipados: sin conexión, timeout, HTTP, datos inválidos, rate limit (429, respeta `Retry-After`).
- **Reintentos:** lecturas 2 veces con espera creciente (solo red/5xx). **Nunca** reintentar automáticamente el POST de una orden. `REJECTED` es un resultado de negocio, no un error.
- **Rate limit:** tratar la API como externa: debounce en búsqueda con cancelación, `staleTime`, sin refetch agresivo, botón de envío deshabilitado en vuelo, polling lento de `PENDING`.
- **Selector de modo de bugs:** en Ajustes, oculto en producción.
- **Extras:** CI con GitHub Actions, historial de órdenes, tests del formulario (React Native Testing Library), accesibilidad básica. Descartados: biometría, EAS.
- Notas de la API observada: `api-notes.md` (no es parte del enunciado).

## Comandos (npm)
- `npm start` levanta Expo (Expo Go). `npm run typecheck`, `npm run lint`, `npm run format` / `format:check`, `npm test`.
- Dependencias de Expo/RN: `npx expo install <pkg>` (versiones compatibles con el SDK 58). El resto con `npm install`.
- `react-dom` está fijado a la misma versión que `react` (peer de expo-router). No actualizar por separado.
- CI (`.github/workflows/ci.yml`) corre typecheck, lint, format:check y test. Todo debe pasar antes de commitear.
- Un commit por paso, mensajes claros en español (convención `tipo: descripción`).

## Cierre de cada etapa
1. La app corre localmente.
2. Los chequeos pasan.
3. Ronda de preguntas para `DECISIONS.md`.
4. Recién ahí se pasa a la etapa siguiente.

## Estado
Plan aprobado en `PLAN.md` (marcar cada etapa al cerrarla). Etapa actual: ver el primer ítem sin tildar. Este archivo se va completando a medida que se aprueban etapas.
