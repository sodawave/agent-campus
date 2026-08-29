# Feature Specification: Campus Core — modelo de dominio + reducer determinista

**Feature Branch**: `cursor/spec-001-campus-core-7599`

**Created**: 2026-08-29

**Status**: Draft (pendiente de clarificación y aprobación)

**Input**: Reconstrucción desde cero tras borrado del engine heredado. Primera capa del
loop de desarrollo (Constitución, Principio VIII: *espec mínima testeada → capas*).
Arrancamos por "campus y toda la estructura core".

---

## Contexto y encuadre

Esta spec es la **capa 1** del núcleo (plano de **Control**, ver `docs/TECH_SPEC.md` §4).
Define el **modelo de dominio puro** de la jerarquía del campus y un **reducer
determinista e idempotente** `reduce(state, event)`. Sin store facade, sin transporte,
sin servicio, sin clientes. Esas son capas posteriores (specs siguientes).

**Fuera de alcance explícito (capas posteriores, no aquí):**

- Store facade por entidad (`building/room/agent/...`).
- `Command` + validación + rechazo (contrato de comandos).
- Transporte (WS / in-memory bus) y servicio `CampusCore`.
- Workers (bucle acotado), tasks (test-gate), org, memory (MemPalace), Spec Kit,
  host/runtime, biblioteca, ProjectCall.
- Cualquier cliente (Godot / web).

Cada uno de esos será **su propia spec**, clarificada y aprobada, antes de implementarse.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconstruir estado de campus reproduciendo eventos (Priority: P1)

Como consumidor del core, quiero **reconstruir el estado de un campus multi-edificio a
partir de una secuencia de `CampusEvent`**, de forma que aplicar el mismo log siempre
produzca el mismo estado (determinismo) y reaplicar eventos duplicados no lo altere
(idempotencia).

**Why this priority**: Es el cimiento del plano de Control y del contrato con clientes
(§4.2/§4.3): "todos los clientes convergen al mismo estado en el mismo orden". Sin un
reducer determinista e idempotente probado, ninguna capa superior es fiable.

**Independent Test**: Vitest sobre `reduce(state, event)` sin canvas ni red: dado un log
`[campus.loaded, building.spawned, room.spawned]`, el estado resultante contiene el
campus con sus edificios y salas; reaplicar el log entero no cambia el estado.

**Acceptance Scenarios**:

1. **Given** estado vacío, **When** se aplica `campus.loaded`, **Then** el estado tiene el
   campus con `id/name` y sin edificios.
2. **Given** un campus cargado, **When** se aplica `building.spawned`, **Then** el edificio
   aparece bajo ese campus con su contexto/ranks mínimos.
3. **Given** un edificio, **When** se aplica `room.spawned`, **Then** la sala aparece
   asociada a ese edificio por `buildingId`.
4. **Given** un log completo, **When** se aplica dos veces seguidas, **Then** el estado
   final es idéntico al de aplicarlo una vez (idempotencia).
5. **Given** dos logs con el mismo conjunto de eventos en el mismo orden, **When** se
   reducen por separado, **Then** producen estados estructuralmente iguales (determinismo).

---

### User Story 2 - Construir entidades del dominio con builders puros (Priority: P2)

Como autor del core, quiero **builders puros** (`buildCampus`, `buildBuilding`,
`buildRoom`) que produzcan entidades válidas con IDs provistos por el caller, para poder
sembrar estado y tests de forma determinista.

**Why this priority**: Habilita fixtures deterministas y desacopla la generación de IDs
(clave para tests reproducibles). Es soporte de la US1.

**Independent Test**: Vitest: cada builder devuelve una entidad con los campos mínimos y
sin efectos secundarios (misma entrada → misma salida).

**Acceptance Scenarios**:

1. **Given** una entrada válida, **When** llamo `buildCampus(...)`, **Then** obtengo un
   `Campus` con `id`, `name` y `buildingIds: []`.
2. **Given** IDs iguales, **When** llamo un builder dos veces, **Then** las entidades son
   estructuralmente iguales.

---

### Edge Cases

- `building.spawned` cuyo `campusId` no corresponde al campus cargado → [NEEDS CLARIFICATION:
  ¿el reducer ignora el evento, lanza, o registra inconsistencia? Propuesta: ignorar y no
  mutar, dado que el reducer es proyección tolerante].
- `room.spawned` con `buildingId` inexistente → misma política que arriba.
- Evento de tipo desconocido → el reducer devuelve el estado sin cambios.
- Reaplicar `campus.loaded` de un campus ya cargado → estado sin cambios (idempotente).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El dominio MUST definir las entidades mínimas `Campus`, `Building` y `Room`
  con solo los campos que esta capa testea (identidad, nombre, relaciones jerárquicas y
  contexto mínimo).
- **FR-002**: El dominio MUST exponer una unión de eventos mínima:
  `campus.loaded`, `building.spawned`, `room.spawned`, todos JSON-serializables (contrato
  neutral de lenguaje, §4.2).
- **FR-003**: El core MUST proveer `reduce(state, event): State` **puro** (sin mutar la
  entrada, sin efectos secundarios).
- **FR-004**: `reduce` MUST ser **idempotente**: reaplicar un evento ya aplicado no cambia
  el estado.
- **FR-005**: La reducción de un log MUST ser **determinista**: mismo log ⇒ mismo estado.
- **FR-006**: El dominio MUST proveer builders puros para crear entidades con IDs provistos
  por el caller (sin generación interna de IDs no determinista).
- **FR-007**: Todo lo anterior MUST ser testeable con Vitest **sin canvas ni red**
  (Criterio de aceptación v0 §12.6).
- **FR-008**: [NEEDS CLARIFICATION: ¿`AgentInstance` (named) entra ya en la capa 1 con
  `agent.instantiated`, o se difiere a la capa siguiente y esta spec cubre solo
  `Campus→Building→Room`?]
- **FR-009**: [NEEDS CLARIFICATION: ¿el contrato de `Command` (petición + posible rechazo)
  forma parte de esta spec, o es su propia spec posterior y aquí solo modelamos eventos +
  reducer?]

### Key Entities *(include if feature involves data)*

- **Campus**: raíz del árbol. Atributos mínimos: `id`, `name`, `buildingIds`.
- **Building** (= Project/edificio): pertenece a un campus. Mínimo: `id`, `campusId`,
  `name`, `context` (mínimo), `ranks` (mínimo o diferido — ver clarificación).
- **Room** (= Workspace/oficina): pertenece a un edificio. Mínimo: `id`, `buildingId`,
  `key`, `context` (mínimo).
- **CampusEvent** (capa 1): unión `campus.loaded | building.spawned | room.spawned`
  (+ `agent.instantiated` si se confirma FR-008).
- **State**: proyección `{ campus, buildings[], rooms[] }` reconstruible desde el log.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un log `[campus.loaded, building.spawned×N, room.spawned×M]` reduce a un
  estado con exactamente N edificios y M salas correctamente asociados.
- **SC-002**: Reaplicar cualquier log produce el mismo estado (0 diferencias) — test de
  idempotencia en verde.
- **SC-003**: 100% de las unidades de esta capa cubiertas por Vitest y en verde antes de
  cerrar la spec (gate de la fase `converge`).
- **SC-004**: 0 dependencias de red/DOM en el paquete de dominio (importable en Node puro).

---

## Assumptions

- Reescritura **desde cero**: no se arrastra el `types.ts` heredado; se reintroduce solo lo
  que esta capa testea. [NEEDS CLARIFICATION: confirmar reescritura total vs. rescatar
  subconjunto auditado del dominio viejo].
- IDs son **strings opacos provistos por el caller** (determinismo en tests).
- Nombres de eventos en formato `entidad.hechoEnPasado` (`building.spawned`).
- El paquete vivirá en `packages/campus-engine` (ruta canónica del plano de Control),
  reconstruido limpio. Se usan los nombres que corresponden por dominio (sin arrastre de
  la base anterior); el nombre no es un punto de decisión.
- Las specs del enfoque descartado se han **eliminado**. Esta es la **001 real** del
  proyecto reconstruido; la numeración arranca aquí.

---

## Preguntas de clarificación (bloquean el paso a `plan`)

1. **Alcance capa 1**: ¿solo `Campus→Building→Room`, o incluimos ya `AgentInstance` +
   `agent.instantiated`? (FR-008)
2. **Command en esta spec o en la siguiente**: ¿modelamos ya el contrato de comandos con
   validación/rechazo, o esta capa es solo *eventos + reducer* y los comandos son la
   capa 2? (FR-009)
3. **Reescritura total vs. rescate auditado**: ¿tipos y helpers desde cero, o rescatamos
   un subconjunto concreto del dominio anterior tras auditarlo?
4. **Política del reducer ante eventos inconsistentes** (campusId/buildingId inexistente):
   ¿ignorar sin mutar (propuesta), lanzar, o registrar inconsistencia?

> Al aprobar respuestas a estas 4, paso a `/plan` (capa 1) y solo entonces implemento +
> testeo. Una spec = una rama (`cursor/spec-001-campus-core-7599`) = un PR.
