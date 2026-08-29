# 031 — Control Panel (UI) (capa 31)

**Rama**: `cursor/spec-031-control-panel-7599` (sobre `main`)

## Objetivo
App web de administración que consume la superficie **GraphQL** para ver el estado del campus y
**editar la config** (idioma / zona horaria). Desacoplada (no comparte código con el engine).

## Alcance
- `apps/control-panel` (Vite): form de config (language/timezone) + Save (mutation `setConfig`);
  overview del campus (name, buildings, agents, projects) vía query. `GRAPHQL_URL =
  http://<host>:8788/graphql`.
- `apps/api/graphql-main.ts`: **CORS** + preflight `OPTIONS` (para el navegador).
- Script raíz `dev:panel` (+ `graphql`).

## Fuera de alcance (siguiente)
- Token de conexión (auth) y **proveedores/modelos** (config) → luego desbloquea `harness`.

## Criterios (build + demo)
- El panel carga la config (`en`/`UTC`) y el overview vía GraphQL.
- Editar y guardar (`setConfig`) persiste en el core: tras recargar, los valores nuevos se
  cargan del core (demostrado).
- typecheck (control-panel incl.) + build en verde; engine 135 + api 15 tests intactos.
