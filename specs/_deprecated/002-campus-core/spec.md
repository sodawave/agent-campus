# Feature Specification: Campus Core (control-plane)

**Feature Branch**: `cursor/spec-campus-core-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "Comenzar por el campus y toda la estructura core: el core autoritativo que posee el estado y las reglas del campus y expone el contrato Command/Event para que hosts y clientes se conecten a una única fuente de verdad."

**Seed docs**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) · [`docs/TECH_SPEC.md`](../../docs/TECH_SPEC.md) (§3 stack, §4 tres planos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El core es la única fuente de verdad (Priority: P1)

Como plataforma, todo el estado del campus (campus → edificios → salas → agentes → runtimes) y sus reglas viven en **un solo lugar autoritativo**. Cualquier actor (cliente o host) obtiene el estado y aplica cambios **solo** a través del contrato del core; nadie muta estado por su cuenta.

**Why this priority**: Es el cimiento de los tres planos. Sin un core autoritativo con contrato definido, ni hosts ni clientes pueden existir de forma coherente.

**Independent Test**: Enviar un Command válido al core produce un Event secuenciado; enviar uno que viola reglas produce el Event de rechazo. El estado resultante es idéntico para cualquier consumidor que reproduzca los eventos.

**Acceptance Scenarios**:

1. **Given** un core inicializado con un campus, **When** un actor envía un Command gobernado válido, **Then** el core lo valida, aplica la regla del dominio y emite el `CampusEvent` de hecho, secuenciado.
2. **Given** un Command que viola una regla (p. ej. rango no permitido), **When** llega al core, **Then** se rechaza y se emite el Event de rechazo correspondiente; el estado no cambia.

### User Story 2 - Un consumidor proyecta el estado de forma consistente (Priority: P1)

Un cliente/host se conecta, recibe el estado actual (o lo reconstruye desde el log de eventos) y a partir de ahí recibe los `CampusEvent` en orden, aplicándolos con `reduce` idempotente.

**Independent Test**: Dos consumidores que reciben la misma secuencia de eventos convergen al mismo estado; reaplicar un evento duplicado no cambia el estado.

**Acceptance Scenarios**:

1. **Given** un consumidor nuevo, **When** se conecta, **Then** obtiene el estado consistente (snapshot o replay) y queda suscrito a eventos posteriores en orden.

### User Story 3 - El contrato es neutral de lenguaje (Priority: P2)

El contrato Command/Event es serializable (JSON) para que clientes en cualquier tecnología (Godot/GDScript, web/TS, CLI) lo consuman sin compartir código con el core.

**Independent Test**: Serializar/deserializar Command y Event a JSON preserva su semántica; un cliente no-TS puede construir un Command válido solo con el esquema.

### Edge Cases

- Command mal formado o de tipo desconocido → rechazo controlado, sin corromper estado.
- Consumidor que se reconecta tras caída → puede recuperar estado (snapshot + cola) sin perder consistencia.
- Orden de eventos concurrente → el core es el único que secuencia (no hay condiciones de carrera entre consumidores).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El core MUST ser la única autoridad del estado del campus y sus reglas (dominio en `campus-engine`).
- **FR-002**: El core MUST distinguir **Command** (petición validable/rechazable) de **Event** (`CampusEvent`, hecho secuenciado) y exponer ambos como un **contrato explícito**.
- **FR-003**: El core MUST validar cada Command gobernado contra las reglas del dominio y emitir el Event de hecho o de rechazo.
- **FR-004**: El core MUST **secuenciar** los eventos (orden total) de forma que cualquier consumidor converja al mismo estado.
- **FR-005**: El contrato Command/Event MUST ser **JSON-serializable** (neutral de lenguaje).
- **FR-006**: Un consumidor MUST poder obtener el estado actual (snapshot y/o replay del log) al conectarse.
- **FR-007**: El core MUST mantener su estado **in-memory** en esta capa (event log + snapshot en memoria); la durabilidad (Postgres) es una capa posterior.
- **FR-008**: El alcance de ejecución de esta capa es el **contrato `CampusCommand`/`CampusEvent` + un core-service in-process** que envuelve `campus-engine` (sin red); el servicio en red (Hono + WS) es la capa `003-campus-api`.
- **FR-009**: Esta capa cubre un **subconjunto mínimo de Commands** que ejercita el camino feliz y el de rechazo: `agent.spawn`, `worker.spawn`, `worker.despawn`. El resto de la fachada se añade en capas posteriores.

### Key Entities

- **CampusCommand** (nuevo): sobre-tipado de las peticiones (crear edificio/sala, instanciar agente, spawnear worker, prestar agente, host join/spawnRuntime, …). Hoy implícitas en la fachada del store.
- **CampusEvent** (existe): hechos secuenciados; contrato hacia consumidores.
- **CampusState** (existe): proyección reducible por `reduce`.
- **Core service**: orquestador que recibe Commands, valida con el dominio, secuencia y publica Events (implementa `AgentCommsPort`).

## Success Criteria *(mandatory)*

- **SC-001**: Un Command válido produce exactamente un Event de hecho secuenciado; uno inválido produce un Event de rechazo y **cero** cambios de estado.
- **SC-002**: Dos consumidores que aplican la misma secuencia de eventos obtienen estado idéntico (determinismo/idempotencia).
- **SC-003**: Command y Event round-trip a JSON sin pérdida semántica.
- **SC-004**: Un consumidor nuevo alcanza el estado correcto vía snapshot/replay.
- **SC-005**: Cobertura de tests (Vitest) de FR-001..006; `typecheck`/`build` verdes.

## Assumptions

- Se reutiliza el dominio existente (`campus-engine`): reglas, `reduce`, fachada por entidad. Esta feature formaliza el **contrato** y el **límite del core**, no reescribe el dominio.
- El transporte concreto (WS/Redis/Buzz) y los clientes (Godot/web) son features posteriores que dependen de este contrato.
- La numeración/estado del feature la gestiona Spec Kit (`002-campus-core`).

## Clarifications

### Session 2026-08-29

Resueltas aplicando el **Principio VIII de la constitución** (loop: incremento mínimo testeado → capas):

- Q: ¿Alcance de ejecución del core en esta capa? → A: Contrato `CampusCommand`/`CampusEvent` + core-service **in-process** envolviendo `campus-engine` (sin red). (FR-008)
- Q: ¿Persistencia en esta capa? → A: **In-memory** (event log + snapshot en memoria); durabilidad en capa posterior. (FR-007)
- Q: ¿Superficie de Commands en esta capa? → A: **Subconjunto mínimo** `agent.spawn` / `worker.spawn` / `worker.despawn` (camino feliz + rechazo por regla de rango). (FR-009)

Capas siguientes previstas (no en esta feature): resto de Commands, red (`003-campus-api`), durabilidad.
