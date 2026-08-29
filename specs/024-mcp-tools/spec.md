# 024 — Ampliar tools MCP (capa 24)

**Rama**: `cursor/spec-024-mcp-tools-7599` (sobre `main`) · **TDD**

## Objetivo
Exponer por MCP las entidades nuevas y de ejecución para que los harnesses operen el campus
completo: projects, assignment, host/runtime, memoria y contexto/lead del building.

## Alcance (`apps/api`)
- `campus_status` enriquecido: buildings (id/name/leaderAgentId), projects, assignments, hosts.
- Nuevas tools: `building_update_context`, `building_assign_lead`, `project_create`,
  `project_archive`, `project_assign`, `project_unassign`, `host_join`, `runtime_start`,
  `memory_remember`.

## Criterios (test-gate, TDD)
- `project_create` + `project_assign` reflejados en `campus_status`.
- `host_join` + `runtime_start` marcan al agente `live`.
- `memory_remember` y `building_assign_lead` aceptan; rechazos correctos (p. ej. assign sin crear → `project_not_found`).
- typecheck (5) + tests (engine 126 + api 10) + build en verde.
