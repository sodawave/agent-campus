# Feature Specification: Agents — AgentInstance + agent.instantiated (capa 2)

**Feature Branch**: `cursor/spec-002-agents-7599`

**Created**: 2026-08-29

**Status**: Ready for plan (incremento mínimo, decisiones fijadas por Principio VIII)

**Input**: Segunda capa del núcleo. Sobre el dominio+reducer de la capa 1
(`001-campus-core`), añadimos la entidad **agente** y su evento de instanciación,
manteniendo el mismo patrón (entidad + evento + case en `reduce` + builder + tests).

---

## Contexto y encuadre

Base: `specs/001-campus-core` (proyección `Campus→Building→Room` con `reduce`
determinista/idempotente/tolerante). Esta capa extiende la proyección con
**`AgentInstance`** (agente **nombrado**, representado en una sala de un edificio) y el
evento **`agent.instantiated`**. Sigue siendo **plano de Control puro**: sin comandos,
sin store facade, sin transporte, sin clientes.

**Fuera de alcance (capas posteriores):**

- Contrato `Command` (petición/validación/rechazo) y `CampusStore` (fachada por entidad).
- Workers anónimos (bucle acotado), tasks (test-gate), org (debate/eval), memoria,
  Spec Kit por edificio, host/runtime, `ProjectCall` (préstamo), biblioteca.
- Campos ricos del agente (harness, rank, supervisor, skill/oficio) — se añaden cuando su
  capa los teste.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Proyectar agentes instanciados en su sala (Priority: P1)

Como consumidor del core, quiero que al aplicar `agent.instantiated` el agente aparezca en
la proyección **asociado a su edificio y sala**, de forma determinista e idempotente.

**Why this priority**: El agente es la entidad central del producto; representarlo en la
proyección es el siguiente cimiento tras la jerarquía.

**Independent Test**: Vitest sobre `reduce`: dado un campus con edificio+sala, aplicar
`agent.instantiated` añade el agente a `state.agents` con `buildingId`/`roomId` correctos;
reaplicar no duplica.

**Acceptance Scenarios**:

1. **Given** un edificio con una sala, **When** se aplica `agent.instantiated`, **Then** el
   agente aparece en `state.agents` con `id`, `name`, `kind: "named"`, `buildingId`, `roomId`.
2. **Given** un agente ya instanciado, **When** se reaplica el mismo evento, **Then** el
   estado no cambia (idempotencia por `id`).
3. **Given** un log con campus+edificio+sala+agente, **When** se reduce dos veces, **Then**
   el estado final es idéntico (determinismo + idempotencia).

### Edge Cases

- `agent.instantiated` con `buildingId` inexistente → ignorar sin mutar (tolerante).
- `agent.instantiated` con `roomId` inexistente (o que no pertenece al `buildingId`) →
  ignorar sin mutar.
- `id` de agente duplicado → ignorar sin mutar.
- Tipo de evento desconocido → estado sin cambios (ya cubierto en capa 1).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El dominio MUST definir `AgentInstance` con campos mínimos: `id`, `name`,
  `kind: "named"`, `buildingId`, `roomId`.
- **FR-002**: El dominio MUST añadir el evento `agent.instantiated` (JSON-serializable) al
  union `CampusEvent`.
- **FR-003**: `State` MUST incluir `agents: AgentInstance[]`.
- **FR-004**: `reduce` MUST manejar `agent.instantiated`: requiere que existan el
  `buildingId` y un `roomId` **perteneciente a ese edificio**; ignora duplicados por `id`;
  no muta la entrada; sigue siendo idempotente y determinista.
- **FR-005**: El dominio MUST proveer `buildAgent` puro (IDs por el caller).
- **FR-006**: Testeable con Vitest sin canvas ni red.

### Key Entities

- **AgentInstance** (capa 2, mínimo): `id`, `name`, `kind: "named"`, `buildingId`, `roomId`.
- **CampusEvent** (+1): `agent.instantiated { agent: AgentInstance }`.
- **State** (+1 campo): `agents: AgentInstance[]`.

---

## Success Criteria *(mandatory)*

- **SC-001**: Un log con K agentes válidos reduce a `state.agents` con exactamente K
  agentes, cada uno asociado a su sala/edificio.
- **SC-002**: Reaplicar el log completo no cambia el estado (idempotencia).
- **SC-003**: Eventos de agente inconsistentes (building/room inexistente o cruzado) no
  alteran el estado.
- **SC-004**: 100% de las unidades nuevas cubiertas por Vitest y en verde antes de cerrar.

## Assumptions

- Solo agentes **nombrados** (`kind: "named"`). Workers anónimos = capa posterior.
- Un agente se instancia en un edificio+sala existentes; la validación cruzada
  (room pertenece a building) la hace el reducer de forma tolerante.
- Reutiliza el patrón e infraestructura de la capa 1 (mismo paquete `campus-engine`).

## Clarificaciones (resueltas · Principio VIII)

| # | Punto | Decisión |
|---|---|---|
| 1 | ¿Campos ricos del agente ya? | **No**: solo mínimos (`id/name/kind/buildingId/roomId`); rank/harness/skill/supervisor → capas posteriores |
| 2 | ¿Workers en esta capa? | **No**: solo `named`; anónimos → capa posterior |
| 3 | Política del reducer | **Tolerante** (ignora inconsistentes/duplicados sin mutar), como capa 1 |

> Una spec = una rama (`cursor/spec-002-agents-7599`) = un PR (apilado sobre 001).
