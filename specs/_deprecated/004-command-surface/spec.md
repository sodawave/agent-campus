# Feature Specification: Command surface expansion

**Feature Branch**: `cursor/spec-command-surface-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "Completar la superficie de Commands para que el core/API pueda conducir la fachada completa: construir edificios/salas, mover agentes entre edificios, y ciclo de vida de hosts/runtimes."

**Seed docs**: [`constitution`](../../.specify/memory/constitution.md) (IV contrato, V fachada, VIII loop) · specs `002-campus-core`, `003-campus-api`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Construir el campus vía comandos (Priority: P1)

Un actor remoto crea edificios y salas y asigna jefes de sala **solo con comandos** (no mutando estado local), y el estado se proyecta a todos.

**Independent Test**: `execute({type:"building.spawn",...})` y `room.spawn` producen eventos `building.spawned`/`room.spawned`; el estado crece de forma consistente.

**Acceptance Scenarios**:

1. **Given** un core cargado, **When** se envía `building.spawn`, **Then** se emite `building.spawned` y el edificio aparece en el estado.
2. **Given** un edificio, **When** se envía `room.spawn`, **Then** se emite `room.spawned` y la sala cuelga del edificio.

### User Story 2 - Mover un agente entre edificios vía comando (Priority: P1)

Un actor presta un agente a otro edificio (`agent.callToBuilding`) y lo devuelve (`agent.returnHome`) por comandos; sin clonar.

**Acceptance Scenarios**:

1. **Given** un agente en su edificio, **When** `agent.callToBuilding` a otro, **Then** el agente pasa a ese edificio (misma instancia); `agent.returnHome` lo devuelve.
2. **Given** un `callToBuilding` a su propio edificio, **When** se envía, **Then** rechazo `same_as_home`.

### User Story 3 - Ciclo de vida de hosts/runtimes vía comando (Priority: P2)

Un host se une (`host.join`), arranca (`host.spawnRuntime`) y para (`host.stopRuntime`) runtimes por comandos.

**Acceptance Scenarios**:

1. **Given** un host online, **When** `host.spawnRuntime` sobre un agente, **Then** el agente queda vivo; un segundo → rechazo `already_running`.

### Edge Cases

- Comandos gobernados que violan reglas → rechazo (`same_as_home`, `already_running`, `host_offline`, `unknown_*`) sin cambiar estado.
- Todo comando nuevo es JSON-serializable y reconocido por el servidor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `CampusCommand` MUST incluir: `building.spawn`, `room.spawn`, `room.assignHead`, `agent.callToBuilding`, `agent.returnHome`, `host.join`, `host.spawnRuntime`, `host.stopRuntime` (además de los de 002).
- **FR-002**: `CampusCore.execute` MUST mapear cada nuevo comando a su método de fachada, capturar/secuenciar eventos y devolver `{ok,events}` o `{ok:false,reason}`.
- **FR-003**: `CampusServer` MUST reconocer los nuevos tipos (rechazar desconocidos).
- **FR-004**: Todos los payloads MUST ser JSON-serializables (neutral de lenguaje); sin importar tipos del store en el dominio.
- **FR-005**: Los rechazos por regla MUST NOT cambiar estado.

### Key Entities

- **CampusCommand** (extendido): payloads inline (campos planos), sin depender de tipos del store.

## Success Criteria *(mandatory)*

- **SC-001**: Cada comando nuevo válido produce sus eventos y cambia el estado esperado.
- **SC-002**: `agent.callToBuilding` a home → `same_as_home`; segundo `host.spawnRuntime` → `already_running`; sin cambios de estado.
- **SC-003**: Un cliente vía `CampusServer`/`CampusClient` proyecta idéntico al servidor tras estos comandos.
- **SC-004**: Tests (Vitest) cubren FR-001..005; `typecheck`/`build` verdes.

## Assumptions

- Reutiliza la fachada del store (ya implementada y testeada) y `CampusCore`/`CampusServer` (002/003).
- **Alcance (VIII)**: esta capa cubre construcción + movilidad + host lifecycle. `specKit.*`, `agent.order/addTask` y demás son micro-capas posteriores.

## Clarifications

Sin `[NEEDS CLARIFICATION]`: alcance resuelto por Principio VIII (incremento: completar los comandos estructurales/movilidad/host; el resto en capas siguientes).
