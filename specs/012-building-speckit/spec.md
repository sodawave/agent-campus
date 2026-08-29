# 012 — Spec Kit por edificio (capa 12)

**Rama**: `cursor/spec-012-building-speckit-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Cada edificio (proyecto) puede activar **Spec-Driven Development**: fases
`constitution → specify → plan → tasks → implement → converge` y artefactos por edificio.

## Alcance
- `SpecKitPhase` + `SPECKIT_PHASES`; `BuildingSpecKit { buildingId, phase }`;
  `SpecKitArtifact { id, buildingId, kind, title }`; `State.specKits[]`, `State.specArtifacts[]`.
- Comandos `speckit.enable` / `speckit.advancePhase` / `speckit.addArtifact`. Eventos
  `speckit.enabled` / `speckit.phase.changed` / `speckit.artifact.upserted`.
- Helpers puros `nextSpecKitPhase`, `projectHasSpecKit`; fachada `specKit.*`.

## Fuera de alcance
Integración con las herramientas reales de Spec Kit (`.specify/`) · convergencia/telemetría.

## Criterios (test-gate)
- `enable` arranca en `constitution`; doble enable → `speckit_already_enabled`; building inexistente → `building_not_found`.
- `advancePhase` recorre las fases hasta `converge`; luego `no_next_phase`.
- `addArtifact` requiere spec kit activo (`speckit_not_enabled`) e id único (`duplicate_id`).
- typecheck (engine+apps) + tests + build en verde.
