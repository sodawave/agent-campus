# Implementation Plan: Campus API (core over a transport)

**Branch**: `cursor/spec-campus-api-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Capa mínima de "core como servicio": una implementación **in-memory** de `AgentCommsPort`, un `CampusServer` que ejecuta Commands (JSON) vía `CampusCore` y publica los `CampusEvent` por el bus, y un `CampusClient` que envía comandos y **proyecta** estado desde el stream. Todo transporte-agnóstico y testeable sin sockets. El adaptador WS/Hono real es la capa siguiente.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict). **Dependencies**: ninguna nueva (in-memory). **Storage**: in-memory. **Testing**: Vitest. **Constraints**: contrato JSON-serializable; `reduce` idempotente; el transporte detrás del puerto.

## Constitution Check

- III runtime propone / core dispone / clientes proyectan (cliente = proyección) · IV Command/Event JSON · **VIII loop mínimo** (in-memory ahora; WS = capa fina posterior). Sin violaciones.

## Project Structure

```text
packages/campus-engine/src/net/
├── InMemoryCommsBus.ts   # implements AgentCommsPort (backend internal)
├── CampusServer.ts       # submit(commandJson) → core.execute + publish
├── CampusClient.ts       # send(command) + subscribe → projection (reduce)
└── index.ts
packages/campus-engine/test/
└── net.test.ts
```

**Structure Decision**: nuevo módulo `net/` en `campus-engine` (coherente con `domain/comms.ts` que ya vive ahí). Reutiliza `CampusCore` (002); no reescribe dominio.

## Phase 0 — research

Sin incógnitas: `AgentCommsPort`, `CommsChannel`, `channelKey` ya existen en `comms.ts`; `CampusCore` en 002.

## Phase 1 — design

- `InMemoryCommsBus`: mapa canal→handlers; `publish` entrega a los suscritos; `subscribe` devuelve unsub.
- `CampusServer(core, bus)`: `submit(json)` → parse `CampusCommand` → `core.execute` → si ok, publica cada evento en canal `campus`; devuelve `CommandResult` (serializable).
- `CampusClient(bus, submit)`: `send(command)` serializa a JSON y llama `submit`; suscrito al canal `campus`, aplica eventos a un `CampusStore` de proyección; `state()`.

## Phase 2 — tasks

Ver [tasks.md](./tasks.md).
