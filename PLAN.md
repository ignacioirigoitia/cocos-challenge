# Plan por etapas

Cada etapa se cierra con: app corriendo, chequeos pasando y ronda de preguntas para `DECISIONS.md`. No se empieza la siguiente sin cerrar la anterior.

- [x] **0. Base**: `CLAUDE.md`, `challenge.md`, `PLAN.md`, `DECISIONS.md` (estructura vacía)
- [x] **1. Análisis** (notas en `api-notes.md`): explorar los 4 endpoints reales (formas, casos borde, datos raros), checklist de requisitos, lista de ambigüedades, decidir qué consultar a Cocos
- [x] **2. Diseño** (resumen en `CLAUDE.md`): estructura de carpetas, React Query vs Zustand (qué va dónde), navegación, estilos, formularios, cliente HTTP, manejo de errores, referencia visual, alcance de extras
- [x] **3. Setup**: repo git, Expo + TypeScript, lint/format, Jest, CI básico (GitHub Actions)
- [x] **4. Features** (una por una, con capa de datos y tests de lógica):
  - [x] 4.1 Instrumentos (lista + retorno)
  - [x] 4.2 Portfolio (valor de mercado, ganancia, rendimiento)
  - [x] 4.3 Búsqueda por ticker
  - [x] 4.4 Modal de órdenes (BUY/SELL, MARKET/LIMIT, cantidad o monto, estados)
- [ ] **5. Producción**: errores, estados vacíos/carga, performance de listas, accesibilidad, extras
- [ ] **6. Entrega**: README (instrucciones + decisiones técnicas), prueba desde cero, mail
- [ ] **7. Llamada**: simulacro de preguntas del equipo sobre las decisiones

## Tests obligatorios (lógica de dinero)
- Retorno de instrumento (último precio vs cierre)
- Valor de mercado, ganancia ($) y rendimiento (%) del portfolio
- Cantidad máxima de acciones a partir de un monto (sin fracciones)
