# 028 — Auto-asignar leader al crear proyecto (capa 28)

**Rama**: `cursor/spec-028-project-leader-7599` (sobre `main`) · **TDD**

## Objetivo
Al crear un proyecto, **asignar automáticamente el leader del edificio** al proyecto para que
tenga en su contexto lo que tiene a su cargo. Es una **asignación normal** (quitable, sin rol
especial ni obligación).

## Alcance
- `project.create` pasa a componer: `project.created` + (si el edificio tiene `leaderAgentId`)
  el leader queda asignado al proyecto (en `reduce`, idempotente).
- Sigue siendo quitable con `project.unassign`. Sin campo nuevo ni evento nuevo.

## Fuera de alcance / backlog
- Toggle de config (por edificio, default off) para desactivar el auto-assign → Control Panel (§15.2).

## Criterios (test-gate, TDD)
- Crear proyecto asigna al leader del edificio (aparece en `agentsForProject`/`projectsForAgent`).
- La asignación del leader es removible (`project.unassign`).
- Idempotente: re-asignar al leader → `already_assigned`.
- typecheck (5) + tests (engine 132 + api 11) + build en verde.
