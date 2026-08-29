# Tasks: Campus Core (control-plane)

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
Incremento mínimo testeado (constitución VIII). Cada bloque cierra con tests.

## Phase 1 — Contract (domain)

- [ ] T001 `domain/types.ts`: añadir `CampusCommand` union mínima (`agent.spawn` | `worker.spawn` | `worker.despawn`), JSON-serializable.

## Phase 2 — Core service

- [ ] T010 `core/CampusCore.ts`: clase `CampusCore` envolviendo `CampusStore` (in-memory).
- [ ] T011 `execute(command): CommandResult` — valida vía dominio, captura y secuencia los `CampusEvent`, devuelve `{ok,events}` o `{ok:false,reason}` (sin cambiar estado en rechazo).
- [ ] T012 `state()`, `eventLog()`, `subscribe()`, `load(input)` (bootstrap).
- [ ] T013 `index.ts`: `export * from "./core"`.

## Phase 3 — Tests (test-gate, FR-001..006)

- [ ] T020 Command válido (`agent.spawn`) → 1+ Event de hecho + estado cambia (FR-001/003, SC-001).
- [ ] T021 Command inválido (`worker.spawn` por no-ic) → `{ok:false}` + Event de rechazo + estado NO cambia (FR-003, SC-001).
- [ ] T022 JSON round-trip de `CampusCommand` sin pérdida (FR-005, SC-003).
- [ ] T023 Replay determinista: aplicar el event log en un store limpio → estado idéntico al snapshot (FR-004/006, SC-002/SC-004).

## Phase 4 — Converge

- [ ] T030 `typecheck` + `test` + `build` verdes → Status `Converged` → PR → merge.
