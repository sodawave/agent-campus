# 017 — Capa de conexión: MCP alrededor del core (capa 17)

**Rama**: `cursor/spec-017-mcp-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Exponer el campus como **tools MCP** para harnesses de IA: que los agentes/harnesses operen el
campus (estructura, agentes, workers, tasks/test-gate) como herramientas. Es un **gateway
adicional** sobre el mismo contrato Command/Event; conecta al core por WebSocket (control →
tools). **Sin auth** por ahora (token → futuro Control Panel).

## Alcance
- `apps/api` (Node, `@modelcontextprotocol/sdk`, `ws`, `zod`).
- `link.ts`: `CampusLink` (send + state); `createWsCampusLink(url)` sobre `CampusClient`.
- `tools.ts`: registro de tools independiente del SDK (testeable): `campus_status`,
  `building_spawn`, `room_spawn`, `agent_instantiate`, `worker_spawn`, `task_assign`,
  `task_start`, `task_submit`, `task_evaluate`.
- `server.ts`: `McpServer` + `StdioServerTransport`, registra las tools.
- `main.ts`: conecta al core (`$CAMPUS_URL`, default `ws://localhost:8787`) y sirve por stdio.

## Fuera de alcance
- Auth/token (→ Control Panel) · GraphQL (capa siguiente) · resto de tools (org, memory, host,
  speckit, library) — se añaden incrementalmente.

## Criterios (test-gate)
- Tools unitarias contra un link in-memory: status refleja el seed; `agent_instantiate` ok;
  `worker_spawn` gate por rango (ic ok / no-ic `rejected: rank_not_allowed`); ciclo de task
  hasta `succeeded` sólo por el supervisor (`not_supervisor` en caso contrario).
- Smoke: el servidor MCP conecta al core vivo y sirve tools por stdio.
- typecheck (5 workspaces) + tests (engine 98 + api 6) + build en verde.
