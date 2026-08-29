# Implementation Plan: Agents — AgentInstance + agent.instantiated (capa 2)

**Branch**: `cursor/spec-002-agents-7599` (apilada sobre `cursor/spec-001-campus-core-7599`)
| **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Extender el dominio+reducer de la capa 1 con la entidad `AgentInstance` (nombrado) y el
evento `agent.instantiated`, manteniendo el mismo patrón puro/idempotente/tolerante.

## Technical Context

**Language/Version**: TypeScript 5.6 (ESM), Node >= 20 · **Testing**: Vitest ·
**Project Type**: paquete de librería `packages/campus-engine` · **Storage**: N/A ·
**Dependencies**: ninguna en runtime.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I/II/III | Reglas solo en `campus-engine`; plano de Control puro; sin clientes |
| IV | +1 evento JSON-serializable; `reduce` idempotente. Command sigue diferido (no violación) |
| V | Agente = una instancia; sin clonado (no hay préstamo en esta capa) |
| VII | Mismo patrón: entidad + evento + case + builder + tests |
| VIII | Incremento mínimo testeable sobre la capa 1 |

Sin violaciones.

## Design

- `AgentInstance { id; name; kind: "named"; buildingId; roomId }`.
- `CampusEvent` += `{ type: "agent.instantiated"; agent: AgentInstance }`.
- `State` += `agents: AgentInstance[]`; `EMPTY_STATE.agents = []`.
- `reduce` case `agent.instantiated`:
  - building debe existir (`state.buildings`),
  - room debe existir y pertenecer a ese building (`state.rooms` con `buildingId` igual),
  - dedupe por `agent.id`,
  - sin mutación; en cualquier inconsistencia → estado sin cambios.
- `buildAgent` puro.

## Project Structure

```text
packages/campus-engine/
  src/domain/types.ts      # +AgentInstance, +agent.instantiated, +State.agents
  src/domain/builders.ts   # +buildAgent
  src/domain/reduce.ts     # +case agent.instantiated
  test/agents.test.ts      # US1 + edge cases
specs/002-agents/{spec,plan,tasks}.md
```

**Structure Decision**: mismo paquete; sin nuevos paquetes ni apps.

## Complexity Tracking

No aplica.
