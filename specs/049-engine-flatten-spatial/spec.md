# Spec 049 — Aplanar contrato espacial en el dominio

## Objetivo (slice 1)

Alinear el core con el contrato 047 **sin** borrar `Room` (sigue siendo FK de agentes):

1. **`Building.waRoomUrl`** — URL del mapa WA (`/~/…` o equivalente) = building.
2. **`building.setWaRoomUrl`** — comando + evento + fachada store.
3. **`Room`** documentado como espacio privado WA (identidad); roles legacy se mantienen.
4. **`Appearance` en building/room** marcado **deprecated** (WA es SoT espacial; skins Godot legado).

## No-goals

- Eliminar tipo `Room` o migrar todos los `roomId`.
- Borrar catálogo `Skin` / `setAppearance` (compat; tests legacy).
- Admin UI crear mapa (050).

## Criterios

- Tests verdes para set/clear `waRoomUrl`.
- Docs TECH_SPEC / WORKADVENTURE / INDEX actualizados.
