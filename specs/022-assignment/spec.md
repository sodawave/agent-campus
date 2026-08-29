# 022 — Assignment: agente ↔ proyecto (capa 22)

**Rama**: `cursor/spec-022-assignment-7599` (sobre `main`) · **TDD**

## Objetivo
Asignar agentes a proyectos (N:N). Al asignar, el **proyecto aparece en el agente**.

## Alcance
- `Assignment { agentId, projectId }`; `State.assignments[]`.
- Comandos `project.assign` / `project.unassign` (+ eventos `project.assigned` / `project.unassigned`).
  Reasons: `agent_not_found`, `project_not_found`, `project_not_in_building`, `already_assigned`, `not_assigned`.
- Helpers `projectsForAgent` / `agentsForProject`; fachada `project.assign/unassign`.
- Regla: el proyecto debe pertenecer al **mismo building** que el agente (`project_not_in_building`).

## Criterios (test-gate, TDD)
- assign añade el vínculo (N:N); `projectsForAgent`/`agentsForProject` lo reflejan.
- Rechazos: cross-building, agente/proyecto inexistente, doble assign (`already_assigned`), unassign sin vínculo (`not_assigned`).
- typecheck (5) + tests (engine 122 + api 6) + build en verde.
