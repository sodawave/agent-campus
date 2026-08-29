# 019 — Room: context + role (capa 19)

**Rama**: `cursor/spec-019-room-7599` (sobre `main`) · **Estado**: en implementación · **TDD**

## Objetivo
Profundizar `Room` con **contexto de departamento** (normas/estilo que alimentan el contexto
efectivo del agente) y **rol tipado** (`RoomRole`), permitiendo fijarlo al crear la sala.
`Room` sigue siendo **entidad normalizada** (con `buildingId`); la ownership la imponen las
reglas (no la anidación).

## Alcance
- `RoomRole = "boss" | "dept" | "utility" | "hallway"`; `Room.role?: RoomRole`; `Room.context?: string`.
- Comando `room.updateContext` (+ evento `room.context.updated`; reason `room_not_found`). Fachada
  `room.updateContext`.
- `room.spawn` acepta `role?`/`context?` opcionales (builder + fachada). La Boss office creada por
  `building.spawn` mantiene `role:"boss"`.

## Fuera de alcance (capas siguientes)
- Metadata de mapa/layout: `workspaceKey` (bind a dpto), capacidad, anclas/asientos, tint (§5.2) —
  con el cliente Godot/mapa.
- `room.delete` (+ guard de Boss no borrable).

## Criterios (test-gate, TDD)
- `room.updateContext` fija el contexto; `room_not_found` si no existe.
- `room.spawn` con `role` crea la sala con ese rol; sin `role` queda sin rol; la Boss room tiene `role:"boss"`.
- `reduce` tolerante: `room.context.updated` de sala inexistente → sin cambios.
- typecheck (5 workspaces) + tests (engine 113 + api 6) + build en verde.
