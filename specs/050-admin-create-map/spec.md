# Spec 050 — Admin: crear mapa WA + bind building

## Objetivo

Permitir crear/vincular un mapa WorkAdventure a un building:

1. GraphQL: `Building.waRoomUrl`, `setBuildingWaRoomUrl`, `provisionBuildingMap`
2. MCP campus: `building_set_wa_room_url`, `building_provision_map`
3. Control Panel: panel Maps (spawn building + URL / provision)

`provisionBuildingMap` sube el starter a map-storage (`directory` = building id) y hace `setWaRoomUrl`.

## No-goals

- Editor de tiles en el panel
- OIDC production
- Borrar rooms del dominio
