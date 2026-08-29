# Implementation Plan: Command surface expansion

**Branch**: `cursor/spec-command-surface-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Extender `CampusCommand` (dominio, payloads inline JSON-serializables) con `building.spawn`, `room.spawn`, `room.assignHead`, `agent.callToBuilding`, `agent.returnHome`, `host.join`, `host.spawnRuntime`, `host.stopRuntime`; mapearlos en `CampusCore.execute`; y ampliar `KNOWN_COMMANDS` del `CampusServer`. Reutiliza la fachada del store.

## Technical Context

TS 5.6 strict · sin deps nuevas · in-memory · Vitest · dominio sin imports del store (payloads con campos planos: `BuildingContext`/`DepartmentContext`/`WorkspaceRole` ya en `types.ts`).

## Constitution Check

IV Command/Event · V fachada por entidad (mapeo 1:1) · VIII incremento mínimo (estructura+movilidad+host ahora; specKit/order luego). Sin violaciones.

## Project Structure

```text
packages/campus-engine/src/domain/types.ts   # + variantes de CampusCommand
packages/campus-engine/src/core/CampusCore.ts # + casos en execute
packages/campus-engine/src/net/CampusServer.ts# + KNOWN_COMMANDS
packages/campus-engine/test/command-surface.test.ts
```

## Phase 2 — tasks

Ver [tasks.md](./tasks.md).
