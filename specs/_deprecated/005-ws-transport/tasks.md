# Tasks: Real WebSocket transport

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1 — Package

- [x] T001 `apps/campus-api/package.json` + `tsconfig.json` (deps `@agent-campus/campus-engine`, `ws`).
- [x] T002 Root `package.json`: `test`/`typecheck` sobre `--workspaces --if-present`.

## Phase 2 — Server / Client

- [x] T010 `src/server.ts`: `createCampusWsServer({ core, port })` — wss + CampusServer/InMemoryCommsBus; catch-up log, broadcast eventos, result por comando.
- [x] T011 `src/client.ts`: `connectCampusWsClient(url)` — `send(command)` → Promise<CommandResult>; proyección por `reduce`; `state()`; `close()`.
- [x] T012 `src/index.ts` exports.

## Phase 3 — Tests (integración, FR-001..005)

- [x] T020 Servidor efímero + cliente: `building.spawn` → result ok + proyección contiene el edificio (SC-001).
- [x] T021 Comando inválido (`worker.spawn` no-ic) → result rechazo + proyección sin cambio (SC-002).
- [x] T022 Dos clientes convergen al mismo estado (SC-003).

## Phase 4 — Converge

- [x] T030 `typecheck` + `test` + `build` verdes → Status `Converged` → PR → merge.
