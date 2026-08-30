# Plan — 042 Skins + Appearance

## Enfoque
Añadir catálogo de skins en estado + optional appearance anidado en Building/Room/Agent, con render Godot que lo consume.

## Cambios técnicos

### 1. Dominio
`packages/campus-engine/src/domain/types.ts`:
- Añadir `type SkinKind = "building" | "room" | "agent"`
- `interface Skin { id: Id; kind: SkinKind; key: string; name: string; assetUrl?: string; palette?: { floor?: string; wall?: string; header?: string; accent?: string }; size?: { w: number; h: number } }`
- `interface Appearance { skinKey?: string; x?: number; y?: number; facing?: "up"|"down"|"left"|"right" }`
- `Building.appearance?`, `Room.appearance?`, `AgentInstance.appearance?`
- Eventos al union: `skin.registered`, `building.appearance.set`, `room.appearance.set`, `agent.appearance.set`
- `State.skins: Skin[]` (empty projection añade `skins: []`)

### 2. Builders
`packages/campus-engine/src/domain/builders.ts`:
- `export function buildSkin(input: { id: Id; kind: SkinKind; key: string; name: string; assetUrl?: string; palette?: {...}; size?: {...} }): Skin`
- Añadir `appearance?: Appearance` opcional a `buildBuilding`, `buildRoom`, `buildAgent`

### 3. Commands
`packages/campus-engine/src/domain/commands.ts`:
- `skin.register` → valida kind válido, id único, key única por kind (por kind, no global) → `skin.registered`
- `building.setAppearance { buildingId: Id; appearance: Partial<Appearance> }` → valida building existe, skinKey existe con kind "building" → `skin_not_found` o `skin_wrong_kind` → `building.appearance.set { buildingId, appearance }` (merge parcial)
- `room.setAppearance`, `agent.setAppearance` — análogo

### 4. Reducer
`packages/campus-engine/src/domain/reduce.ts`:
- Case `skin.registered` → upsert en `skins` array
- Case `*.appearance.set` → merge parcial en `appearance` del target (if null, assign)

### 5. Facade
`packages/campus-engine/src/store/CampusStore.ts`:
- Añadir facade `skin` con `register(input)`
- Añadir métodos `setAppearance` en facades `building`, `room`, `agent`

### 6. Tests Vitest
`packages/campus-engine/test/skins.test.ts`:
- skin.register: alta válida, id duplicado, key duplicada por kind, kind inválido
- skin registrado aparece en state

`packages/campus-engine/test/appearance.test.ts`:
- setAppearance: asigna skin+xy, merge parcial (setear x no borra skin), skin inexistente, skin de kind incorrecto, entidad inexistente
- reducer: logs viejos sin appearance siguen reduciendo (compatibilidad)
- protocolo: eventos en snapshot

### 7. Seed
`apps/server/src/main.ts`:
- Registrar catálogo inicial:
  - Buildings: `hq-office` (palette: floor="#1a1a2e", wall="#16213e", header="#0f3460", accent="#e94560"), `warehouse`
  - Rooms: `office`, `lab`
  - Agents: `staff-a`, `staff-b`
- Asignar appearance:
  - b-alpha: skinKey="hq-office", x=2, y=2
  - rooms: relativas al building con rects basados en skin.size
  - agentes: relativos a sus rooms con coords

### 8. Godot
`apps/campus-godot/campus_client.gd`:
- Arrays `skins: Array` + diccionarios `appearance_building`, `appearance_room`, `appearance_agent`
- Plegar `skin.registered` → upsert skins
- Plegar `*.appearance.set` → merge en diccionario correspondiente

`apps/campus-godot/main.gd`:
- `TILE := 32.0` constante
- Al dibujar building: si tiene appearance y skin → usa palette (floor, wall, header, accent); si tiene x,y → dibuja en x·TILE, y·TILE; fallback layout automático si no
- Rooms: coords relativas al building (x + buildingX, y + buildingY)
- Agents: coords relativas a la room (x + roomX, y + roomY)

### 9. Converge
- `npm run typecheck` verde
- `npm test` verde
- `npm run build` verde
- Captura visual con skins visibles

### 10. Merge
- Commit descriptivo
- PR a `dev`
- Merge a `dev`