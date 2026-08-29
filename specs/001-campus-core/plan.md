# Implementation Plan: Campus Core — dominio + reducer determinista

**Branch**: `cursor/spec-001-campus-core-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-campus-core/spec.md`

## Summary

Capa 1 del núcleo (plano de Control): modelo de dominio puro `Campus→Building→Room` y un
`reduce(state, event): State` **puro, idempotente y tolerante**, reconstruible desde un log
de `CampusEvent`. Sin agentes, comandos, store, transporte ni clientes (capas posteriores).
Enfoque: incremento mínimo testeable con Vitest (Constitución, Principio VIII).

## Technical Context

**Language/Version**: TypeScript 5.6 (ESM), Node >= 20

**Primary Dependencies**: ninguna en runtime; dev: `vitest`, `typescript`

**Storage**: N/A (estado en memoria, reconstruible desde el log de eventos)

**Testing**: Vitest (unit, sin DOM ni red)

**Target Platform**: Node puro (paquete de dominio importable por cualquier consumidor TS)

**Project Type**: monorepo npm workspaces — paquete de librería `packages/campus-engine`

**Performance Goals**: N/A en capa 1 (funciones puras O(n) sobre el log)

**Constraints**: `domain/` sin dependencias de render/red; `reduce` sin I/O ni mutación de la entrada

**Scale/Scope**: 3 entidades, 3 eventos, 1 reducer, 3 builders

## Constitution Check

*GATE: debe pasar antes de implementar; re-check tras el diseño.*

| Principio | Cumplimiento en esta capa |
|---|---|
| I. Core autoritativo | Reglas solo en `packages/campus-engine`; nada de negocio fuera |
| II. Tres planos sin fugas | Solo plano de Control; `domain/` no importa render ni store |
| III. Runtime propone / core dispone / clientes proyectan | `reduce` es la proyección de solo lectura; sin clientes aún |
| IV. Command vs Event (neutral de lenguaje) | Solo `CampusEvent` JSON-serializable + `reduce` idempotente. Command → capa posterior (diferido explícito, no violación) |
| V. Fachada por entidad / no clonar | La fachada `CampusStore` es capa posterior; aquí solo dominio+reduce. Sin agentes → no aplica clonado todavía |
| VI. Test-gate y worker acotado | No hay tasks/workers en esta capa; el gate de la capa = Vitest en verde |
| VII. Coherencia estructural | Un patrón: dominio puro + reducer puro; helpers puros; imports `type`-only |
| VIII. Loop mínimo testeado | Esta capa ES el incremento mínimo testeable; capas siguientes añaden encima |

Sin violaciones. No procede tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-campus-core/
├── spec.md              # Ready for plan
├── plan.md              # Este archivo
└── tasks.md             # Fase /tasks
```

### Source Code (repository root)

```text
packages/campus-engine/
├── package.json         # @agent-campus/campus-engine (ESM, scripts build/typecheck/test)
├── tsconfig.json        # extends ../../tsconfig.base.json
├── src/
│   ├── domain/
│   │   ├── types.ts     # Campus, Building, Room, CampusEvent, State
│   │   ├── builders.ts  # buildCampus, buildBuilding, buildRoom (puros)
│   │   ├── reduce.ts    # reduce(state, event): State (puro, idempotente, tolerante)
│   │   └── index.ts     # barrel domain
│   └── index.ts         # barrel paquete
└── test/
    ├── reduce.test.ts   # US1
    └── builders.test.ts # US2
```

**Structure Decision**: paquete de librería único (`packages/campus-engine`) en el monorepo
existente. `apps/*` no se toca en esta capa (no hay cliente todavía).

## Design (Phase 1)

### Data model

- `Campus { id: string; name: string; buildingIds: string[] }`
- `Building { id: string; campusId: string; name: string }`
- `Room { id: string; buildingId: string; key: string }`
- `State { campus: Campus | null; buildings: Building[]; rooms: Room[] }`
- `EMPTY_STATE: State = { campus: null, buildings: [], rooms: [] }`

### Event contract (JSON-serializable)

```ts
type CampusEvent =
  | { type: "campus.loaded"; campus: Campus }
  | { type: "building.spawned"; building: Building }
  | { type: "room.spawned"; room: Room };
```

### Reducer (puro, idempotente, tolerante)

- `campus.loaded`: si ya hay campus con ese `id` → sin cambios; si no → set campus.
- `building.spawned`: requiere campus cargado y `campusId` coincidente; ignora duplicados por `id`.
- `room.spawned`: requiere `buildingId` existente; ignora duplicados por `id`.
- `default`: estado sin cambios (tipo desconocido).
- Nunca muta la entrada (crea nuevos objetos/arrays).

## Complexity Tracking

No aplica (sin violaciones de constitución).
