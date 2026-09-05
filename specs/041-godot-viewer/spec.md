# 041 — Visor Godot: recuperación de mapa + proyectos (inventario)

> **Superseded** — Presentación espacial canónica = WorkAdventure + `apps/wa-bridge`.  
> No nuevas features Godot. Ver [specs/INDEX.md](../INDEX.md) y [docs/WORKADVENTURE.md](../../docs/WORKADVENTURE.md).

**Rama**: `opencode/spec-041-godot-viewer` (sobre `dev`)

## Objetivo
Recuperar el cliente Godot del cursor (specs 037-040) adaptado al estado actual de `dev`, cumpliendo las premisas de representación:
- **Mapa**: campus → buildings → rooms (espacial)
- **Agents/workers**: ubicados en sus rooms
- **Projects**: **inventario del building** (no nodos del mapa); asociados al leader por defecto + agentes asignados
- **Sin proyectos huérfanos**: el core ya lo impone (`buildingId` obligatorio + validación `building_not_found`)

## Premisas de representación

| Concepto | Representación |
|---|---|
| Campus | Título/cabecera |
| **Buildings** | Nodos del mapa (rectángulos/paneles) |
| **Rooms** | Sub-nodos dentro de su building (leader marcada) |
| Agents / Workers | Labels/sprites en su room |
| **Projects** | Inventario del building (panel/lista) — nunca nodos del mapa |
| Asignaciones | Texto en el inventario: leader por defecto + asignados |

## Antecedentes
- Specs 037-040 cursor (completas, con implementación GDScript madura)
- El reductor GDScript replica la regla del core: al crear un proyecto, el leader del building se auto-asigna (reduce.ts:116)
- El tipo `Project.buildingId` es obligatorio y `project.create` rechaza huérfanos

## Cambios de contexto (vs cursor)
- Seed del server renombrado: building `"Project Alpha"` → `"Alpha HQ"` (no confusiones)
- `apps/campus-godot` fue recreado ad-hoc en dev; se reemplazará con la implementación cursor portada

## Alcance
- `apps/campus-godot` (Godot 4, GDScript):
  - `campus_client.gd`: WebSocket + reductor tolerante (campus, buildings, rooms, agents, workers, projects, tasks, assignments)
  - `main.gd`/`main.tscn`: mapa top-down simple, projects como inventario, workers fila, liveness (puntos verdes)
  - `project.godot`: config mínima (sin arte externo, dibujo vectorial `_draw`)
  - `run.sh`: launcher con Godot 4.7 del sistema
- `apps/server/src/main.ts`: seed building name `"Alpha HQ"` (antes `"Project Alpha"`)
- Documento en `specs/041-godot-viewer/spec.md` (este)

## Fuera de alcance (capas siguientes)
- Tileset/sprites reales, isométrico, mobiliario, animaciones
- Interacción → Commands; hosts/debates/memoria en el mapa

## Criterios (test-gate)
- Con el core sembrado corriendo (`ws://localhost:8787`), el visor Godot:
  1. Muestra 1 building `"Alpha HQ"` con 3 rooms (leader, marketing, engineering)
  2. Agents colocados en sus rooms (Leader, Mia, Ivan) + worker en engineering
  3. Inventario del building: `"Onboarding → Leader, Ivan"` (leader por defecto + asignación explícita)
  4. Worker como fila `"1 worker(s)"` en engineering
  5. `npm test` verde (engine sin cambios)
  6. Evidencia: captura de pantalla del mapa + log de Godot

## Notas técnicas
- El reductor GDScript (`_reduce`) ignora eventos desconocidos (tolerante)
- `building.spawned` incluye `leaderRoom` y `leaderAgent` en el payload (reductor ya lo maneja)
- `project.created` replica la auto-asignación del leader en el cliente (como en spec-040 cursor)
- Idempotencia: diccionarios por ID; eventos repetidos actualizan, no duplican