# Tasks — 042 Skins + Appearance

## Dominio

1. [ ] Añadir `SkinKind`, `Skin`, `Appearance` a `packages/campus-engine/src/domain/types.ts`
2. [ ] Añadir `Building.appearance?`, `Room.appearance?`, `AgentInstance.appearance?`
3. [ ] Añadir eventos `skin.registered`, `building.appearance.set`, `room.appearance.set`, `agent.appearance.set` al union `CampusEvent`
4. [ ] Añadir `skins: Skin[]` a `State`; añadir a `EMPTY_STATE`
5. [ ] `packages/campus-engine/src/domain/builders.ts`: `buildSkin` + extender builders con `appearance?` opcional
6. [ ] `packages/campus-engine/src/domain/commands.ts`: comandos `skin.register`, `*.setAppearance` con validaciones
7. [ ] `packages/campus-engine/src/domain/reduce.ts`: 4 cases nuevos (upsert skin + merge appearance)
8. [ ] `packages/campus-engine/src/store/CampusStore.ts`: fachadas `skin.register`, `building.setAppearance`, etc.

## Tests

9. [ ] `packages/campus-engine/test/skins.test.ts`: alta, duplicados, kind inválido
10. [ ] `packages/campus-engine/test/appearance.test.ts`: setAppearance, merge parcial, validaciones, compatibilidad logs viejos

## Seed

11. [ ] `apps/server/src/main.ts`: registrar catálogo inicial (2 buildings, 2 rooms, 2 agents con paletas)
12. [ ] Seed: asignar appearance a b-alpha, rooms, agentes (coords tiles)

## Godot

13. [x] `apps/campus-godot/campus_client.gd`: arrays skins + apariencias; plegar 4 eventos
14. [ ] ~~`apps/campus-godot/main.gd`: `TILE := 32`; usar appearance+palette si existe, dibujar en coords (building→campus, room→building, agent→room); fallback layout automático~~ **(Movido a spec 043)**

## Converge

15. [ ] `npm run typecheck` verde
16. [ ] `npm test` verde
17. [ ] `npm run build` verde
18. [ ] Captura visual con skins aplicados: `SHOT_PATH=/tmp/skins-test.png CAMPUS_URL=ws://localhost:8787 bash apps/campus-godot/run.sh --resolution 900x560`

## Merge

19. [ ] Commit descriptivo en rama
20. [ ] PR a `dev`
21. [ ] Merge a `dev`