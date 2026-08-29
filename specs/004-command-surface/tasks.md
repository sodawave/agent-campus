# Tasks: Command surface expansion

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1 — Contract

- [x] T001 `domain/types.ts`: añadir variantes a `CampusCommand` (building.spawn, room.spawn, room.assignHead, agent.callToBuilding, agent.returnHome, host.join, host.spawnRuntime, host.stopRuntime) con payloads inline JSON-serializables.

## Phase 2 — Core + Server

- [x] T010 `core/CampusCore.ts`: casos en `execute` mapeando a la fachada del store; mapear resultados (Call/ReturnHome/SpawnRuntime/StopRuntime) a `CommandResult`.
- [x] T011 `net/CampusServer.ts`: ampliar `KNOWN_COMMANDS`.

## Phase 3 — Tests (test-gate, FR-001..005)

- [x] T020 building.spawn + room.spawn → eventos y estado (SC-001).
- [x] T021 agent.callToBuilding (a otro edificio) + returnHome → misma instancia se mueve y vuelve (SC-001).
- [x] T022 callToBuilding a home → `same_as_home`; sin cambio (SC-002).
- [x] T023 host.join + host.spawnRuntime → agente vivo; segundo → `already_running` (SC-001/SC-002).
- [x] T024 vía CampusServer/CampusClient: proyección idéntica tras varios comandos nuevos (SC-003).
- [x] T025 comando desconocido → rechazo en el server.

## Phase 4 — Converge

- [x] T030 `typecheck` + `test` + `build` verdes → Status `Converged` → PR → merge.
