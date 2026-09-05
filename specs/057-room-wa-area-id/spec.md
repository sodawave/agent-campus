# Spec 057 — Room.waAreaId in seed + bridge

## Objetivo

Cablear el contrato espacial: cada room del seed tiene `waAreaId`; el
wa-bridge coloca escritorios por área (no solo por `roomId`); GraphQL/panel
exponen el campo.

## Criterios

- Seed: rooms + leader offices con `area-*` ids.
- `deskPosition` prioriza `waAreaId` → `AREA_DESKS`.
- GraphQL `Room.waAreaId`, `Agent.waAreaId`, mutation `setRoomWaAreaId`.
- Presence JSON incluye `waAreaId`.
