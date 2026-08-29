# Feature Specification: Wire the playground to the core

**Feature Branch**: `cursor/spec-wire-playground-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "El web playground debe dejar de mutar estado local y proyectar desde el core: lee de la proyección del cliente y envía Commands. Demostrar los tres planos en el navegador."

**Seed docs**: [`constitution`](../../.specify/memory/constitution.md) (I/III/IV/VIII) · specs `002`–`005`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El cliente es proyección pura del core (Priority: P1)

En el navegador, toda interacción del usuario **envía un Command** al core (vía server/cliente sobre el bus in-memory); la UI **lee** de la proyección del cliente (solo-lectura) y se re-renderiza al llegar los eventos. Ninguna pantalla muta estado local.

**Independent Test**: abrir el playground; spawnear worker / prestar agente / arrancar runtime → el mapa y paneles reflejan el estado proyectado del core; la consola no muestra errores.

**Acceptance Scenarios**:

1. **Given** el playground cargado, **When** el usuario ejecuta una acción (p. ej. Spawn worker en un agente ic), **Then** se envía el Command, el core lo aplica y la proyección del cliente se actualiza en pantalla.
2. **Given** una acción que viola una regla (worker por no-ic), **When** se ejecuta, **Then** no cambia el estado proyectado.

### Edge Cases

- La UI no llama a la fachada del store directamente para mutar; solo `send(command)`.
- Reads provienen de la proyección del cliente, no de un store "local".

## Requirements *(mandatory)*

- **FR-001**: Completar los Commands que la UI necesita: `agent.introduce`, `agent.order`, `speckit.enable`, `speckit.advancePhase`, `speckit.addArtifact` (además de los existentes).
- **FR-002**: `CampusClient` (engine/net) MUST exponer `subscribe(listener)` y `read()` (la proyección `CampusStore`) para que la UI lea y se re-renderice.
- **FR-003**: El playground MUST construir core + server + client (bus in-memory), leer de `client.read()` y mutar solo vía `client.send(command)`.
- **FR-004**: La carga/seed inicial (setup) puede usar el store del core directamente; las **interacciones de usuario** van por Commands.

## Success Criteria *(mandatory)*

- **SC-001**: Todas las mutaciones de las pantallas se realizan vía `send(command)` (no fachada local).
- **SC-002**: La UI proyecta el estado del core; acciones válidas se reflejan, inválidas no cambian estado.
- **SC-003**: `typecheck`/`test`/`build` verdes; nuevos comandos con tests; demo visual en navegador sin errores de consola.

## Assumptions

- Transporte **in-memory** en el navegador (engine `net/`); el cliente ws real (005) es para node/remoto. Reutiliza core/server/client existentes.
- **Alcance (VIII)**: rewire de las pantallas actuales + comandos que faltan. Godot y features de robustez son capas posteriores.

## Clarifications

Sin `[NEEDS CLARIFICATION]`: alcance resuelto por Principio VIII (rewire mínimo del playground + comandos necesarios).
