# Tasks: Wire the playground to the core

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1 — Engine (commands + client API)

- [x] T001 `domain/types.ts`: `CampusCommand` += `agent.introduce`, `agent.order`, `speckit.enable`, `speckit.advancePhase`, `speckit.addArtifact`.
- [x] T002 `core/CampusCore.ts`: casos `execute` para los nuevos comandos.
- [x] T003 `net/CampusServer.ts`: `KNOWN_COMMANDS` += nuevos.
- [x] T004 `net/CampusClient.ts`: `subscribe(listener)` + `read(): CampusStore`.
- [x] T005 `test/wire.test.ts`: nuevos comandos aplican vía server/client; `subscribe`/`read` funcionan.

## Phase 2 — Playground rewire

- [x] T010 `app.ts`: seed store → `CampusCore(store)` → server + bus + client (replay log); export `read` (client.read), `send(command)`, `onChange` (client.subscribe), `activeBuilding` sobre read.
- [x] T011 `screens/gamification.ts`: reads via `read`; writes (worker.spawn/despawn, hire=agent.spawn, transfer=callToBuilding/returnHome, host.join/spawnRuntime/stopRuntime) via `send`.
- [x] T012 `screens/org.ts`: reads via `read`; issue order + spec kit via `send`.
- [x] T013 `screens/chats.ts`: reads via `read` (sin mutaciones de core).

## Phase 3 — Verify (test-gate + visual)

- [x] T020 `typecheck` + `test` + `build` verdes.
- [ ] T021 Demo navegador (spawn/transfer/host/spec kit) sin errores de consola → screenshots/video.

## Phase 4 — Converge (gated)

- [ ] T030 Status `Converged` tras autorización visual del usuario → PR ya abierto → merge.
