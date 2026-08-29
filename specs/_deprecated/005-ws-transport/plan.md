# Implementation Plan: Real WebSocket transport

**Branch**: `cursor/spec-ws-transport-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Nuevo paquete `apps/campus-api`: un servidor WS que envuelve `CampusServer`/`CampusCore` (con `InMemoryCommsBus`), difunde eventos y responde resultados; y un `CampusWsClient` que envía comandos y proyecta estado desde el stream. Test de integración sobre `ws` real en puerto efímero.

## Technical Context

TS 5.6 strict · dep nueva: `ws` (+ `@types/ws`, `@types/node`) · Vitest (integración async) · Node 22.

## Constitution Check

III clientes proyectan · IV Command/Event JSON sobre el socket · VIII adaptador mínimo (auth/redis/reconnect = capas posteriores). Sin violaciones.

## Project Structure

```text
apps/campus-api/
├── package.json          # deps: @agent-campus/campus-engine, ws
├── tsconfig.json
├── src/
│   ├── server.ts         # createCampusWsServer({ core, port }) → { port, close }
│   ├── client.ts         # connectCampusWsClient(url) → { send, state, close }
│   └── index.ts
└── test/ws.test.ts       # integración: server efímero + cliente real
```

Root `package.json` `test` → `--workspaces --if-present` (para incluir el nuevo paquete).

## Phase 1 — design (protocolo)

- Cliente→servidor: `{ id, command }` (JSON).
- Servidor→cliente: `{ type:"log", events }` al conectar; `{ type:"event", event }` por cada publicado; `{ type:"result", id, result }` por comando.
- Cliente: `send(command)` resuelve al recibir `result` con su `id`; log/event → `CampusStore.dispatch` (proyección).

## Phase 2 — tasks

Ver [tasks.md](./tasks.md).
