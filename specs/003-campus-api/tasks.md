# Tasks: Campus API (core over a transport)

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
Incremento mínimo testeado (constitución VIII).

## Phase 1 — Comms port

- [ ] T001 `net/InMemoryCommsBus.ts`: implementa `AgentCommsPort` (publish/subscribe por `channelKey`).

## Phase 2 — Server / Client

- [ ] T010 `net/CampusServer.ts`: `submit(commandJson: string): CommandResult` → parse → `core.execute` → publica eventos en canal `campus`.
- [ ] T011 `net/CampusClient.ts`: `send(command): CommandResult`; suscripción al canal `campus` → proyección vía `CampusStore.dispatch`; `state()`.
- [ ] T012 `net/index.ts` + export desde `src/index.ts`.

## Phase 3 — Tests (test-gate, FR-001..006)

- [ ] T020 Command válido del cliente → estado proyectado del cliente == estado del servidor (SC-001).
- [ ] T021 Command inválido → rechazo, cero eventos publicados, estado del cliente sin cambios (SC-002).
- [ ] T022 El límite cruza strings JSON; parse/serialize sin pérdida (SC-003).
- [ ] T023 Segundo cliente converge por replay del log (SC-004).
- [ ] T024 Doble entrega de evento → proyección idempotente sin cambio.

## Phase 4 — Converge

- [ ] T030 `typecheck` + `test` + `build` verdes → Status `Converged` → PR → merge.
