# Feature Specification: Campus API (core over a transport)

**Feature Branch**: `cursor/spec-campus-api-7599`

**Created**: 2026-08-29

**Status**: Clarified (ready for plan)

**Input**: "El core como servicio: hosts y clientes hablan con él por el cable. Command/Event cruzan como JSON; los consumidores proyectan."

**Seed docs**: [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) (III flujo, IV contrato, VIII loop mínimo) · [`docs/TECH_SPEC.md`](../../docs/TECH_SPEC.md) §4.3 · `domain/comms.ts` (`AgentCommsPort`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un consumidor remoto envía un Command y ve el hecho (Priority: P1)

Un cliente/host **remoto** (sin compartir código con el core) envía un `CampusCommand` serializado; el core lo ejecuta y **publica** el/los `CampusEvent` resultantes por el bus; el consumidor los recibe y actualiza su proyección.

**Why this priority**: Es lo que convierte al core en "servicio": actores desacoplados hablando por un transporte. Sin esto, el core solo es una librería in-process.

**Independent Test**: Con un bus in-memory, un `CampusClient` envía un comando (como JSON) a un `CampusServer`; el cliente recibe los eventos y su estado proyectado coincide con el del servidor.

**Acceptance Scenarios**:

1. **Given** server y cliente sobre el mismo bus, **When** el cliente envía un Command válido (JSON), **Then** el servidor lo ejecuta, publica los Events, y el estado proyectado del cliente == estado del servidor.
2. **Given** un Command que viola una regla, **When** se envía, **Then** el servidor responde rechazo y **no** publica hechos; el estado del cliente no cambia.

### User Story 2 - Un consumidor que entra tarde se pone al día (Priority: P2)

Un consumidor que se conecta después obtiene el estado (snapshot) y/o reproduce el log para converger, luego sigue recibiendo eventos en orden.

**Independent Test**: Un segundo cliente creado tras varios comandos reconstruye el mismo estado desde snapshot/replay.

### Edge Cases

- Command JSON mal formado / tipo desconocido → rechazo controlado, sin corromper estado ni publicar hechos.
- Doble entrega de un evento (reintento) → la proyección idempotente no cambia.
- El transporte es un detalle detrás del puerto: cambiar de in-memory a WS no altera el contrato.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST implementar `AgentCommsPort` (publish/subscribe de `CampusEvent` por canal) con un backend **in-memory** (esta capa).
- **FR-002**: Un `CampusServer` MUST aceptar un `CampusCommand` **serializado (JSON)**, ejecutarlo vía `CampusCore`, y **publicar** los `CampusEvent` resultantes por el bus; devolver el resultado (ok/rechazo).
- **FR-003**: Un `CampusClient` MUST enviar Commands (JSON) y **suscribirse** a los eventos del bus, manteniendo una **proyección** por `reduce` idempotente.
- **FR-004**: En rechazo, el servidor MUST NOT publicar hechos ni cambiar estado.
- **FR-005**: Command y Event MUST cruzar el límite como **JSON** (neutral de lenguaje); el transporte es sustituible sin tocar el contrato.
- **FR-006**: Un consumidor nuevo MUST poder converger vía snapshot y/o replay del log.

### Key Entities

- **AgentCommsPort** (existe en `domain/comms.ts`): puerto publish/subscribe por `CommsChannel`.
- **InMemoryCommsBus** (nuevo): implementación in-process del puerto (backend `internal`).
- **CampusServer** (nuevo): envuelve `CampusCore`; `submit(commandJson)` → ejecuta + publica.
- **CampusClient** (nuevo): envía comandos y proyecta estado desde el stream de eventos.

## Success Criteria *(mandatory)*

- **SC-001**: Tras un Command válido enviado por el cliente, su estado proyectado es **idéntico** al del servidor.
- **SC-002**: Un Command inválido devuelve rechazo, **cero** eventos publicados y estado del cliente sin cambios.
- **SC-003**: El límite cliente↔servidor cruza **strings JSON**; parse/serialize sin pérdida.
- **SC-004**: Un segundo cliente converge al mismo estado por replay del log.
- **SC-005**: Tests (Vitest) cubren FR-001..006; `typecheck`/`build` verdes.

## Assumptions

- Reutiliza `CampusCore` (002) y el dominio; esta capa añade **transporte + puerto de comms**, no reglas nuevas.
- **Alcance mínimo (constitución VIII)**: backend **in-memory** ahora; el adaptador **WS/Hono real** y Redis/Buzz son **capas posteriores** (adaptadores finos del mismo puerto). No se levanta servidor de red en esta feature.

## Clarifications

Sin `[NEEDS CLARIFICATION]`: las decisiones de alcance (in-memory vs red, contrato JSON, transporte sustituible) las resuelve el **Principio VIII** (incremento mínimo testeable → capas). El adaptador WS real se planifica como capa siguiente.
