# 042 — Catálogo de skins + appearance

> **Superseded (espacial Godot)** — El contrato appearance/skins en core puede permanecer;  
> proyección espacial pasa a WA. Ver [specs/INDEX.md](../INDEX.md) y [docs/WORKADVENTURE.md](../../docs/WORKADVENTURE.md).

**Rama**: `opencode/spec-042-skins-appearance` (sobre `dev`)

## Objetivo
Extender los modelos (building, room, agent) con propiedades de representación para el motor gráfico: skin, x, y, etc. Building, room y agent tienen librerías de skins (catálogos). El core secuencia estos datos y los clientes convergen a la misma visualización.

## Decisiones de diseño confirmadas

| # | Decisión | Valor |
|---|---|---|
| 1 | Catálogo de skins | En el estado del core (event-sourced) |
| 2 | Coordenadas | Jerárquicas: building→campus, room→building, agent→room |
| 3 | Unidades | Tiles |
| 4 | Alcance | Render Godot incluido |
| 5 | Target de merge | `dev` |

## Alcance

**Dominio + protocolo:**
- `Skin { id, kind: "building"|"room"|"agent", key, name, assetUrl?, palette?, size? }`
- `Appearance { skinKey?, x?, y?, facing? }`
- `Building.appearance?`, `Room.appearance?`, `AgentInstance.appearance?`
- Comandos: `skin.register`, `building.setAppearance`, `room.setAppearance`, `agent.setAppearance`
- Eventos: `skin.registered`, `building.appearance.set`, `room.appearance.set`, `agent.appearance.set`
- State añade `skins: Skin[]`

**Store:**
- Fachadas `store.skin.register`, `store.building/room/agent.setAppearance`

**Seed:**
- Catálogo inicial (2 buildings, 2 rooms, 2 agents con palette)
- Appearance asignada (b-alpha, rooms, agentes)

**Godot:**
- `campus_client.gd`: pliega los 4 eventos nuevos
- `main.gd`: dibuja en x·TILE, y·TILE con palette del skin (TILE=32px); fallback a layout automático si no hay appearance

**Tests Vitest:**
- `test/skins.test.ts` + `test/appearance.test.ts`
- Validaciones, merge parcial, compatibilidad con logs viejos

## Criterios (test-gate)
- Todos los nuevos tests pasan
- `npm run typecheck` verde (engine)
- `npm run build` verde
- Captura del visor Godot muestra skins visibles (paletas aplicadas)
- PR a `dev` mergeable