# 040 — Cliente Godot: projects + tasks (capa 40)

**Rama**: `cursor/spec-040-godot-projects-7599` (apilada sobre `cursor/spec-039-godot-liveness-7599`)

## Objetivo
Más **paridad de proyección** con el viewer web (gráficos ligeros): el mapa muestra
los **projects** asignados a cada agente y las **tasks** del building con su estado.
La semilla ya trae el proyecto "Onboarding" (asignado a Ivan) y la task "Ship
onboarding" en `under_review`.

## Alcance
- `campus_client.gd`: el reductor pliega también `project.created/archived`,
  `project.assigned/unassigned`, `task.created/started/submitted/evaluated`.
  - Guarda `leaderAgentId` del building (viene en `building.spawned`) y **replica
    la regla del core (capa 28)**: al crear un proyecto, el leader del building se
    auto‑asigna (derivado en el reducer del core, no es un evento aparte).
  - Helpers `projects_of_agent`, `tasks_of_building`.
- `main.gd`:
  - línea `proj: …` bajo cada agente asignado (alturas de celda ajustadas).
  - tira **Tasks** al pie del building: punto de color por estado + `título [estado]`
    (queued/running/under_review/succeeded/needs_revision).
  - barra de estado añade `· N projects · N tasks`.

## Fuera de alcance (capas siguientes)
- Tileset/sprites reales, isométrico ("lo mollar" gráfico).
- Interacción → Commands; hosts/debates/memoria en el mapa.

## Criterios (test-gate)
- Contra el core sembrado: Ivan y el Leader muestran `proj: Onboarding`; la tira de
  tasks muestra `Ship onboarding [under_review]` (color ámbar). Evidencia: PNG.
