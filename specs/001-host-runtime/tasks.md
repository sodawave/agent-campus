# Tasks: Host & Runtime (execution plane)

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
Convención: `[P]` = paralelizable. Cada bloque cierra con sus tests (test-gate).

## Phase 1 — Domain (US1 base)

- [x] T001 `domain/host.ts`: añadir `workingDir?: string` a `AgentRuntime` y `HostSpawnRequest`.
- [x] T002 `domain/host.ts`: `buildAgentHost(input)` (status `online`, `lastSeenAt`, `campusUrl` default).
- [x] T003 `domain/host.ts`: `buildAgentRuntime(input)` (status `running`, `startedAt`, `workingDir?`).
- [x] T004 `domain/index.ts`: reexport si aplica (ya via `export * from "./host"`).

## Phase 2 — Store (US1/US2/US3)

- [x] T010 `CampusState`: `hosts: AgentHost[]`, `runtimes: AgentRuntime[]` (+ EMPTY_STATE).
- [x] T011 Getters: `getHost`, `hosts()`, `runtimes()`, `runtimesOf(hostId)`, `liveAgents()`, `isAlive(agentId)`.
- [x] T012 Fachada `store.host`: `join`, `heartbeat`, `leave`, `spawnRuntime`, `stopRuntime` (con resultados tipados/guards).
- [x] T013 Reducer: `host.joined`, `host.heartbeat`, `host.left` (offline + stop runtimes + dormir agentes), `runtime.started` (liveness), `runtime.stopped` (dormir).

## Phase 3 — Tests (test-gate, cubre FR-001..FR-007)

- [x] T020 `test/host.test.ts`: join→online (SC-… /FR-001).
- [x] T021 spawnRuntime→vivo con workingDir (FR-002, SC-001).
- [x] T022 doble spawn→`already_running` (FR-003, SC-002).
- [x] T023 stopRuntime→dormido, identidad intacta (FR-004, SC-003).
- [x] T024 heartbeat actualiza lastSeenAt (FR-005).
- [x] T025 leave→offline + runtimes fuera + agentes dormidos (FR-006, SC-004).
- [x] T026 rechazos: unknown_host/host_offline/unknown_agent/unknown_runtime.

## Phase 4 — Playground (demo / US1)

- [x] T030 `app.ts`: seed — join host `laptop-ana` + spawnRuntime para un agente (queda vivo).
- [x] T031 `gamification.ts`: indicador "vivo" (anillo) en agentes con `runtimeId`.
- [x] T032 `gamification.ts`: panel Hosts (estado + runtimes) con join / start-runtime / stop.

## Phase 5 — Converge

- [x] T040 `npm run typecheck && npm test && npm run build` verdes.
- [x] T041 Demo en navegador (agente "vivo en host") → screenshot.
- [x] T042 Actualizar Status a `Converged` y PR → merge.
