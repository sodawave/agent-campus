# Tasks: Campus Core — dominio + reducer determinista

**Branch**: `cursor/spec-001-campus-core-7599` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Cada tarea se cierra solo con su **test-gate** en verde (Constitución, Principio VI/VIII).

## Fase A — Andamiaje del paquete

- [ ] **T001** Crear `packages/campus-engine/package.json` (`@agent-campus/campus-engine`,
  `type: module`, scripts `build`/`typecheck`/`test`, devdeps `vitest` + `typescript`).
- [ ] **T002** Crear `packages/campus-engine/tsconfig.json` que extiende `../../tsconfig.base.json`
  (`outDir dist`, `rootDir src`, `declaration`).
- [ ] **T003** Actualizar `package.json` raíz: retirar referencias a `apps/playground` (borrado);
  `build` apunta a `packages/campus-engine`; `test`/`typecheck` siguen con `--workspaces --if-present`.

## Fase B — Dominio (US2: builders puros, P2)

- [ ] **T004** `src/domain/types.ts`: `Campus`, `Building`, `Room`, `State`, `EMPTY_STATE`,
  union `CampusEvent` (3 variantes JSON-serializables).
- [ ] **T005** `src/domain/builders.ts`: `buildCampus`, `buildBuilding`, `buildRoom` (puros,
  IDs por caller, sin efectos).
- [ ] **T006** Barrels `src/domain/index.ts` y `src/index.ts`.
- [ ] **T007** `test/builders.test.ts`: cada builder devuelve entidad con campos mínimos;
  misma entrada → salida estructuralmente igual. **Gate**: verde.

## Fase C — Reducer (US1: reconstrucción por eventos, P1)

- [ ] **T008** `src/domain/reduce.ts`: `reduce(state, event): State` puro; casos
  `campus.loaded` / `building.spawned` / `room.spawned` / `default`; idempotente; tolerante
  (ignora inconsistentes y duplicados sin mutar).
- [ ] **T009** `test/reduce.test.ts`:
  - Escenarios de aceptación US1 (1–5): asociación de N edificios y M salas.
  - Idempotencia: aplicar el log dos veces = una vez (SC-002).
  - Determinismo: dos reducciones del mismo log = estados iguales.
  - Tolerancia: `building.spawned` con `campusId` inexistente, `room.spawned` con
    `buildingId` inexistente, evento de tipo desconocido → estado sin cambios (FR-010).
  - Inmutabilidad: la entrada no se muta.
  **Gate**: verde.

## Fase D — Cierre (converge)

- [ ] **T010** `npm run typecheck && npm test && npm run build` en verde; pegar salida de
  Vitest como evidencia en el PR.
- [ ] **T011** Commits por cambio lógico, push, actualizar PR #13. **Sin merge** (lo aprueba
  el humano).

## Trazabilidad

| Requisito | Tarea(s) |
|---|---|
| FR-001/002 entidades+eventos | T004 |
| FR-003/004/005 reduce puro/idempotente/determinista | T008, T009 |
| FR-006 builders puros | T005, T007 |
| FR-007 testeable sin canvas/red | T007, T009 |
| FR-008/009 alcance (sin agentes/commands) | T004 (union mínima) |
| FR-010 tolerancia | T008, T009 |
| SC-001..004 | T009, T010 |
