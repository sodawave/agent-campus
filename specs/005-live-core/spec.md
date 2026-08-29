# Feature Specification: Live core (headless service + minimal screen)

**Feature Branch**: `cursor/reset-to-core-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "Un core serverless sin pantalla que corre el core y sirve el estado/eventos por el cable; y una pantalla mínima que se conecta y muestra lo que pasa."

**Seed docs**: `.specify/memory/constitution.md` (I core autoritativo, III runtime propone/core dispone/clientes proyectan, IV Command/Event, VIII loop mínimo); `docs/TECH_SPEC.md` §4.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El core corre como servicio sin pantalla (P1)

Un proceso **headless** (sin UI) arranca el core, carga un campus y **escucha** conexiones. No pinta nada; solo sirve estado y eventos.

**Independent Test**: arrancar el proceso; conectarse por el cable devuelve un snapshot del estado y el log de eventos.

**Acceptance Scenarios**:

1. **Given** el servicio arrancado, **When** un cliente conecta, **Then** recibe el estado actual + el log para converger.
2. **Given** un cliente conectado, **When** envía un Command válido, **Then** el core lo aplica y difunde los eventos; un Command inválido se rechaza sin cambiar estado.

### User Story 2 - Una pantalla mínima muestra lo que pasa (P1)

Una pantalla mínima se conecta al servicio y **muestra en vivo** el estado (edificios, agentes) y el flujo de eventos; puede enviar un par de Commands de prueba.

**Independent Test**: abrir la pantalla; refleja el estado del core; al enviar un Command, la pantalla se actualiza con el evento resultante.

## Requirements *(mandatory)*

- **FR-001**: Un servicio headless (sin pantalla) MUST arrancar el core, cargar un campus y escuchar conexiones.
- **FR-002**: Al conectar, el servicio MUST enviar snapshot(estado) + log de eventos.
- **FR-003**: El servicio MUST aceptar Commands (JSON), ejecutarlos vía el core y **difundir** los eventos; rechazos no cambian estado.
- **FR-004**: Una pantalla mínima MUST conectarse, proyectar el estado (por `reduce`) y mostrar el stream de eventos; sin lógica de negocio.
- **FR-005**: Command/Event cruzan como JSON (transporte sustituible).

## Success Criteria *(mandatory)*

- **SC-001**: El servicio arranca headless y sirve estado+log al conectar.
- **SC-002**: Un Command desde la pantalla se refleja en su proyección (== estado del core).
- **SC-003**: Test automático del servicio (conectar, snapshot, command→evento) + arranque verificado.

## Assumptions

- Reutiliza el core sano (`packages/campus-engine`): dominio, reglas, `CampusCore`, contrato Command/Event.
- **Mínimo (VIII)**: un transporte WS simple; auth/Redis/Buzz/reconexión = capas posteriores. La pantalla es mínima (listas), no el mapa final.

## Clarifications

Sin `[NEEDS CLARIFICATION]`: alcance = incremento mínimo real (servicio headless + pantalla mínima) por Principio VIII.
