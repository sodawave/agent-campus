# Feature Specification: Real WebSocket transport

**Feature Branch**: `cursor/spec-ws-transport-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "El core como servicio de verdad sobre el cable: clientes remotos envían comandos por WebSocket y reciben el stream de eventos."

**Seed docs**: [`constitution`](../../.specify/memory/constitution.md) (III/IV/VIII) · specs `002`/`003`/`004`. Sustituye el transporte in-memory (003) por WS **detrás del mismo puerto**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un cliente remoto opera el core por WebSocket (Priority: P1)

Un cliente se conecta por WS, recibe el log para ponerse al día, envía un `CampusCommand` y recibe (a) el stream de `CampusEvent` publicados y (b) el resultado de su comando.

**Why this priority**: convierte el core en servicio real sobre red; es lo que habilita hosts/clientes en distintos dispositivos (incl. el futuro cliente Godot).

**Independent Test**: levantar el servidor WS en un puerto efímero, conectar un cliente, enviar `building.spawn`, y verificar que el resultado es `ok` y la proyección del cliente contiene el edificio.

**Acceptance Scenarios**:

1. **Given** un servidor WS con el core cargado, **When** un cliente se conecta, **Then** recibe el log de eventos y su proyección converge al estado del servidor.
2. **Given** un cliente conectado, **When** envía un Command válido, **Then** recibe los eventos y un `result: ok`; su proyección refleja el cambio.
3. **Given** un Command inválido, **When** se envía, **Then** recibe `result: {ok:false, reason}` y su proyección no cambia.

### Edge Cases

- Mensaje no-JSON o comando desconocido → `result` de rechazo, sin corromper estado.
- Varios clientes conectados → todos reciben el mismo stream de eventos en orden.

## Requirements *(mandatory)*

- **FR-001**: Un servidor WS MUST envolver `CampusServer`/`CampusCore` y, por conexión, enviar el log actual para catch-up.
- **FR-002**: El servidor MUST aceptar mensajes `{ id, command }` (JSON), ejecutar vía `CampusServer.submit`, responder `{ type:"result", id, result }` y **difundir** los eventos publicados a todos los clientes como `{ type:"event", event }`.
- **FR-003**: Un cliente WS MUST enviar comandos (`send(command) → Promise<CommandResult>`), aplicar log+eventos a una proyección `reduce` idempotente y exponer `state()`.
- **FR-004**: Todo lo que cruza el socket MUST ser JSON (neutral de lenguaje); el transporte es sustituible sin tocar el contrato Command/Event.
- **FR-005**: Rechazos no cambian estado; múltiples clientes convergen.

## Success Criteria *(mandatory)*

- **SC-001**: Tras conectar y enviar comandos válidos, la proyección del cliente == estado del servidor.
- **SC-002**: Un comando inválido devuelve rechazo y no cambia la proyección.
- **SC-003**: Dos clientes convergen al mismo estado.
- **SC-004**: Test de integración (Vitest) sobre WS real en puerto efímero; `typecheck`/`build` verdes.

## Assumptions

- Nuevo paquete `apps/campus-api` (servicio node) que depende de `campus-engine` y `ws`. Reutiliza `CampusServer` + `InMemoryCommsBus` en el servidor.
- **Alcance (VIII)**: adaptador WS mínimo (submit + broadcast + catch-up). Auth, Redis/Buzz, reconexión con backoff, y snapshot binario = capas posteriores.

## Clarifications

Sin `[NEEDS CLARIFICATION]`: alcance resuelto por Principio VIII (adaptador mínimo del mismo puerto; features de robustez en capas siguientes).
