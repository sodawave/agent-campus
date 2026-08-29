# 016 — CLI host (capa 16)

**Rama**: `cursor/spec-016-cli-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Un **CLI de terminal** (`campus`) que se conecta al core por WebSocket y participa en el
**plano de ejecución**: se une como host y arranca/detiene runtimes de agentes. **Sin
credenciales** por ahora (el token de conexión, idioma y zona horaria se definirán más
adelante en una app "Control Panel"/admin).

## Alcance
- `apps/cli` (Node + `ws`, `tsx`). Adapta un `WebSocket` cliente a `Connection` y usa
  `CampusClient` (proyección + `send`).
- Comandos: `status`, `host-join`, `host-leave`, `runtime-start`, `runtime-stop`, `watch`.
- URL del core desde `$CAMPUS_URL` (default `ws://localhost:8787`). Script raíz `npm run cli -- <cmd>`.

## Fuera de alcance
- Autenticación / token (→ Control Panel).
- `agent spawn` por arquetipo, catálogo, heartbeat (capas posteriores).

## Criterios (verificación terminal)
- `status` se conecta y proyecta el estado del campus.
- `host-join` registra un host; `runtime-start` deja al agente `[live]`; `status` posterior lo refleja.
- Rechazos del core se muestran con su motivo.
- `typecheck` (engine+server+viewer+cli) y `build` en verde.
