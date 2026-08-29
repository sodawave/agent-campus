# 025 — Viewer: Projects + assignments (capa 25)

**Rama**: `cursor/spec-025-viewer-projects-7599` (sobre `main`)

## Objetivo
Proyectar en el viewer las entidades `Project` (inventario del building) y las **assignments**
(el proyecto aparece en el agente). Solo presentación.

## Alcance
- `apps/viewer`: panel **Projects (inventory) & assignments** (proyecto, estado, building, agentes
  asignados); etiqueta de proyectos en cada agente (`projectsForAgent`); botones "Create project"
  y "Assign 1st agent → 1st project".
- `apps/server`: seed enriquecido con un proyecto (`Onboarding`) y una asignación (Ivan).

## Criterios (verificación manual)
- El panel Projects muestra el proyecto del seed con sus agentes; el agente muestra su etiqueta `[Onboarding]`.
- Crear proyecto y asignar en vivo actualizan panel + etiquetas (`✓ project.created`/`project.assigned`).
- typecheck + build en verde (engine 126 + api 10 intactos).
