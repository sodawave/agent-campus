## Plan

1. **Seed** (`apps/server/src/main.ts`): paletas clay en skins; añadir b-beta (tower),
   b-gamma (studio) con rooms + agents + appearance con coords de tiles.
2. **iso.gd**: proyección 2:1 (`TILE_W×TILE_H`), `project`, `color` (hex), `shade`, `hashstr`.
3. **campus_view.gd**: diorama — base crema, césped checker en rejilla iso, caminos de arena,
   árboles procedurales, edificios caja 3 caras (wall/header/accent), sombra blanda, personas
   clay, burbuja de conteo, labels con sombra. Todo pintado en orden far→near (`sort by x+y`).
4. **room_view.gd**: stub (fondo + nota + lista de rooms).
5. **main.gd** shell: conexión + pump + dispatch al view activo + `Tab` + HUD (título, pill de
   modo, status, hint) + SHOT_PATH existente.
6. **Converge**: typecheck (engine) + test + build; correr visor contra seed con screenshots
   (modo campus y room) sin errores de parseo.