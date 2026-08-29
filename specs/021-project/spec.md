# 021 — Project: entidad + inventario del building (capa 21)

**Rama**: `cursor/spec-021-project-7599` (sobre `main`) · **TDD**

## Objetivo
Introducir `Project` como **sub-entidad dentro del building** (Entorno): el **inventario** de
proyectos que conceptualmente vive en la room del Leader. El proyecto ya **no** equivale al building.

## Alcance
- `Project { id, buildingId, name, status: "active"|"archived" }`; `State.projects[]`.
- Comandos `project.create` / `project.archive` (+ eventos `project.created` / `project.archived`).
  Reasons: `building_not_found`, `duplicate_id`, `project_not_found`.
- Helper `projectsForBuilding(state, buildingId)` (= inventario); fachada `project.create/archive`; builder `buildProject`.

## Fuera de alcance (siguiente)
- Assignment agente↔proyecto (capa 22). `project.rename`, memoria por-proyecto, etc.

## Criterios (test-gate, TDD)
- `project.create` añade el proyecto (active) al building; `projectsForBuilding` filtra por building (inventario).
- Rechazos: `building_not_found`, `duplicate_id`, `project_not_found` (archive).
- typecheck (5) + tests (engine 118 + api 6) + build en verde.
