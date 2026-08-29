# Implementation Plan: Wire the playground to the core

**Branch**: `cursor/spec-wire-playground-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Completar los Commands que la UI usa (`agent.introduce`, `agent.order`, `speckit.enable/advancePhase/addArtifact`), exponer `CampusClient.subscribe/read`, y rewire del playground: construir core+server+client (bus in-memory), leer de `client.read()` y mutar solo con `client.send(command)`.

## Technical Context

TS 5.6 strict · engine net/ (in-memory, browser-safe) · Vitest + demo navegador · sin deps nuevas.

## Constitution Check

I core autoritativo · III clientes proyectan (la UI deja de mutar) · IV Command/Event · VIII incremento (rewire de pantallas actuales + comandos necesarios; Godot/robustez luego). Sin violaciones.

## Project Structure

```text
packages/campus-engine/src/domain/types.ts     # + comandos UI
packages/campus-engine/src/core/CampusCore.ts  # + casos execute
packages/campus-engine/src/net/CampusServer.ts # + KNOWN_COMMANDS
packages/campus-engine/src/net/CampusClient.ts # + subscribe(), read()
packages/campus-engine/test/wire.test.ts       # comandos nuevos + subscribe/read
apps/playground/src/app.ts                      # core+server+client; export read/send/onChange
apps/playground/src/screens/*.ts                # reads via read; writes via send(command)
```

## Phase 2 — tasks

Ver [tasks.md](./tasks.md).
