# Feature Specification: Host & Runtime (execution plane)

**Feature Branch**: `cursor/spec-host-runtime-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "El agente instanciado por CLI vive en una máquina (host) que lo alimenta con acceso a sus ficheros; envía sus acciones al core y cada cliente lo renderiza. Modelar hosts y runtimes en el core, con liveness en el agente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un agente cobra vida en un host (Priority: P1)

Un host (máquina, incluso headless por CLI) se une al campus y arranca el runtime de un agente existente. El agente pasa de "representado" (dormido) a **vivo**, alimentado por ese host, con un `workingDir` asociado. En el mapa se distingue vivo vs dormido.

**Why this priority**: Es el núcleo del plano de ejecución (TECH_SPEC §4). Sin esto no hay agentes "vivos" ni base para el bucle del worker.

**Independent Test**: `host.join` + `agent.spawn` + `host.spawnRuntime` → el agente aparece en `liveAgents()` con `hostId`/`runtimeId`/`workingDir`; el resto del sistema sigue igual.

**Acceptance Scenarios**:

1. **Given** un host online y un agente dormido, **When** se arranca su runtime, **Then** el agente queda vivo (`hostId`/`runtimeId` seteados, runtime `running`) y emite `runtime.started`.
2. **Given** un agente ya vivo, **When** se intenta arrancar otro runtime, **Then** se rechaza (`already_running`) y no se duplica.

### User Story 2 - Parar un runtime deja al agente dormido (Priority: P2)

Se detiene el runtime de un agente vivo; el agente vuelve a "representado" sin perder identidad.

**Independent Test**: `host.stopRuntime` → el agente sale de `liveAgents()`, `hostId`/`runtimeId = null`, emite `runtime.stopped`.

**Acceptance Scenarios**:

1. **Given** un agente vivo, **When** se para su runtime, **Then** queda dormido y su identidad (home, org, rank) se mantiene intacta.

### User Story 3 - Un host se desconecta (Priority: P3)

Un host abandona el campus; sus runtimes paran y sus agentes quedan dormidos, sin perder identidad.

**Independent Test**: `host.leave` con runtimes activos → host `offline`, sus runtimes eliminados, sus agentes dormidos.

**Acceptance Scenarios**:

1. **Given** un host online con N runtimes, **When** hace `leave`, **Then** el host queda `offline`, esos N runtimes se eliminan y esos N agentes quedan dormidos.
2. **Given** un host online, **When** manda `heartbeat`, **Then** actualiza `lastSeenAt` y sigue `online`.

### Edge Cases

- `spawnRuntime` sobre host inexistente/offline → rechazo (`unknown_host` / `host_offline`).
- `spawnRuntime` sobre agente inexistente → `unknown_agent`.
- `stopRuntime` sobre runtime inexistente → `unknown_runtime`.
- Reaplicar un mismo evento (red) no cambia el estado (idempotencia).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El core MUST registrar hosts (`host.join`) con estado `online` y `lastSeenAt`.
- **FR-002**: El core MUST arrancar el runtime de un agente existente en un host (`host.spawnRuntime`), fijando `agent.hostId`/`runtimeId` y `AgentRuntime.workingDir`, emitiendo `runtime.started`.
- **FR-003**: El core MUST impedir dos runtimes para el mismo agente (`already_running`).
- **FR-004**: El core MUST parar runtimes (`host.stopRuntime`) → `runtime.stopped`, dejando al agente dormido (`hostId`/`runtimeId = null`).
- **FR-005**: El core MUST procesar `host.heartbeat` (actualiza `lastSeenAt`, mantiene `online`).
- **FR-006**: El core MUST procesar `host.leave` → host `offline` + parar sus runtimes + dormir sus agentes.
- **FR-007**: El `reduce` MUST ser puro e idempotente para todos los eventos `host.*` / `runtime.*`.
- **FR-008**: `domain/` MUST NOT importar render/store; la fachada vive en el store (`store.host.*`).

### Key Entities

- **AgentHost**: máquina que ejecuta runtimes (`id`, `label`, `status`, `lastSeenAt`, `allowed*Keys`, `campusUrl`).
- **AgentRuntime**: proceso vivo de un `AgentInstance` en un host (`id`, `hostId`, `agentId`, `projectId`, `rankKey`, `skillKey`, `harness`, `status`, `startedAt`, `workingDir?`).
- **AgentInstance.hostId/runtimeId**: liveness (null = dormido).

## Success Criteria *(mandatory)*

- **SC-001**: Tras `spawnRuntime`, `isAlive(agentId) === true` y el agente figura en `liveAgents()`.
- **SC-002**: Doble `spawnRuntime` sobre el mismo agente devuelve `{ ok:false, reason:"already_running" }` y `runtimes` no crece.
- **SC-003**: Tras `stopRuntime`, `isAlive(agentId) === false` y la identidad del agente no cambia.
- **SC-004**: Tras `leave`, todos los runtimes del host desaparecen y sus agentes quedan dormidos.
- **SC-005**: `npm test` cubre FR-001..FR-007; `typecheck`/`build` verdes; demo en cliente muestra "vivo en host".

## Clarifications

Decisiones tomadas (equivalente a `/speckit-clarify`) para des-riesgar antes de `plan`:

- **workingDir**: se modela como **metadato/manifiesto** en `AgentRuntime`/`HostSpawnRequest`. **No** hay sandbox de FS real en esta spec (out of scope).
- **1 runtime por agente**: sí, invariante (guard `already_running`). Un agente no está vivo en dos hosts a la vez.
- **Host offline**: `leave` elimina sus runtimes y duerme a sus agentes (no se conserva runtime "zombie").
- **spawnRuntime**: **adjunta** un runtime a un agente ya existente (`agentId`). Crear agente+runtime en un solo paso es azúcar futura, fuera de esta spec.
- **campusUrl**: por defecto `local://campus` si no se indica.
- **Worker = bucle acotado**: **fuera de alcance**; requiere el proceso host real. Esta spec deja el *binding/ciclo de vida*; el loop llega en su propia spec (CLI/host real).

## Assumptions

- Existe ya un campus cargado con al menos un edificio y un agente (specs previas).
- El transporte de red real (WS/Redis/Buzz) y el binario CLI real son de specs posteriores; aquí se modela el estado de control (control-plane).
- Auth/token del host es un campo opcional; no se valida criptográficamente en esta spec.
