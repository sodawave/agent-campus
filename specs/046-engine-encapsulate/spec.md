# Spec 046 — Encapsular `engine/`

## Objetivo

Mover el ambient campus a `engine/`: `packages/engine` (`@agent-campus/engine`) + apps
vivos; eliminar godot/viewer; raíz thin.

## Criterios

- Layout `engine/{packages/engine,apps/*}`
- `npm run typecheck && npm test && npm run build` verdes en `engine/`
- Sin `apps/campus-godot` ni `apps/viewer`
