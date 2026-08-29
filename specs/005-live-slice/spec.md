# 005 — Live slice: WS + apps (capa 5)

**Rama**: `cursor/spec-005-live-slice-7599` (sobre 004) · **Estado**: en implementación

## Objetivo
Primer **vertical slice ejecutable**: un core headless expuesto por **WebSocket** y un
**viewer** de navegador que proyecta el estado y envía comandos. Cierra el bucle
cliente↔core sobre transporte real, reutilizando el `net` de la capa 4 (el adaptador WS vive
en las apps; el engine sigue puro).

## Alcance
- `apps/server`: servicio headless (Node + `ws`). Envuelve `CampusServer`, siembra un campus
  demo, y adapta cada socket `ws` a la interfaz `Connection` del engine.
- `apps/viewer`: app Vite de navegador. Adapta `WebSocket` a `Connection`, usa `CampusClient`,
  renderiza la proyección (campus → edificios → salas → agentes) y envía comandos (spawn
  building/room/agent + uno inválido), mostrando `CommandResult` (✓ evento / ✗ motivo).
- Scripts raíz `dev:server` / `dev:viewer`. `vite.config` permite host Tailscale.

## Fuera de alcance (capas siguientes)
Autenticación/hosts · workers (bucle acotado) · tasks (test-gate) · org · memory · Spec Kit por
edificio · cliente rico (Godot / mapa) · persistencia.

## Criterios (verificación manual, es el checkpoint visual)
- El viewer conecta (`open`) y proyecta el seed (Demo Co, Project Alpha, Mia/Ivan).
- Un comando válido actualiza el estado en vivo y registra `✓ …`.
- Un comando inválido devuelve `✗ building_not_found` sin cambiar el estado.
- `npm run typecheck` (engine+server+viewer) y `npm run build` en verde; tests del engine (49) siguen verdes.
