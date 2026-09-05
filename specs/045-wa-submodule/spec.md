# Spec 045 — WorkAdventure como submodule

## Problema

`workadventure/` era un clone suelto (a veces parchado: mapa, timeouts). Mezclar
vendor en el monorepo impide updates limpios y viola “no escribir sobre WA”.

## Objetivo

1. `workadventure/` = **git submodule** pinneado a tag **`v1.33.5`**.
2. Política: **prohibido editar** ficheros bajo `workadventure/`.
3. Script de upload de mapa starter en `scripts/wa/` (fuera del submodule).
4. Docs AGENTS / WORKADVENTURE actualizados.

## No-goals

- Encapsular `engine/` (046).
- Implementar MCP WA (047+).
- Conservar patches locales del mapa (descartados).

## Criterios

- `.gitmodules` apunta a `workadventure/workadventure`.
- HEAD del submodule = `v1.33.5`.
- `scripts/wa/upload-starter-to-map-storage.sh` existe y lee `workadventure/maps/`.
- Docs prohíben editar el submodule.
