# 037 — Cliente Godot: slice mínimo (capa 37)

**Rama**: `cursor/spec-037-campus-godot-7599` (sobre `main`)

## Objetivo
Primer cliente **Godot** del plano de presentación: conectar al core por
**WebSocket** y **proyectar** el estado real (`campus → buildings → rooms →
agents`). Solo lectura; el input del usuario como Commands vendrá en capas
siguientes. Es el análogo Godot del viewer web (capa 5), consumiendo el mismo
contrato `CampusEvent` **neutral de lenguaje** (sin compartir código con el
engine TS).

## Alcance
- `apps/campus-godot` (Godot 4.3, GDScript, renderer `gl_compatibility`):
  - `campus_client.gd` (`class_name CampusClient`): `WebSocketPeer` + **reductor
    tolerante** que pliega solo `campus.loaded`, `building.spawned` (con
    `leaderRoom`/`leaderAgent`), `room.spawned`, `agent.instantiated`; ignora el
    resto (igual que el reductor TS).
  - `main.gd` / `main.tscn`: proyección `campus → buildings → rooms → agents`
    (nombre, `key`/`role` de room, `rankKey`/`skillKey` del agente) + barra de
    estado de conexión. Conecta a `CAMPUS_URL` (default `ws://127.0.0.1:8787`).
- `run.sh`: usa `godot` del PATH/`GODOT_BIN` o descarga Godot 4.3 a una caché.
- `package.json` mínimo (sin scripts) para no romper los workspaces npm.

## Fuera de alcance (capas siguientes)
- Enviar Commands desde Godot (interacción). Sprites/tiles de "juego" reales,
  layout espacial, workers/tasks/hosts, animaciones (`Introducing`, etc.).
- Hornear Godot en el entorno del Cloud Agent (hoy `run.sh` lo descarga).

## Criterios (test-gate)
- Con el core sembrado corriendo, el cliente conecta, recibe el snapshot y
  **renderiza** el campus con sus buildings/rooms/agents (evidencia: PNG headless).
- El resto del monorepo (typecheck/tests/build) sigue en verde (la app Godot no
  participa en esos scripts).
