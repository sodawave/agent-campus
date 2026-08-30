# Plan — 041 Godot viewer recovery

## Enfoque
Portar implementación cursor (spec-040) a dev + fix de seed building name "Project Alpha" → "Alpha HQ"

## Cambios

| Archivo | Acción |
|---|---|
| `apps/server/src/main.ts` | Renombrar building name a "Alpha HQ" |
| `apps/campus-godot/` | Reemplazar con implementación cursor (main.gd, campus_client.gd, etc.) |
| `apps/campus-godot/project.godot` | Actualizar features "4.3" → "4.7" (Godot versión local) |
| `apps/campus-godot-adhoc-bak/` | Eliminar código ad-hoc previo |

## Implementación
- Copy/paste desde `origin/cursor/spec-040-godot-projects-7599:apps/campus-godot/`
- Engine sin cambios (ya cumple el modelo: no huérfanos, leader auto-asignado)

## Verificación
- `npm run build` verde
- `npm test` engine verde (142 tests)
- `SHOT_PATH=/tmp/campus-test.png CAMPUS_URL=ws://localhost:8787 bash apps/campus-godot/run.sh --resolution 900x560` → captura generada
- Captura muestra building/rooms/agents/projects según premisas