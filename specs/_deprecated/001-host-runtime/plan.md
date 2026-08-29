# Implementation Plan: Host & Runtime (execution plane)

**Branch**: `cursor/spec-host-runtime-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Modelar en el core el registro de **hosts** y el ciclo de vida de **runtimes**, reflejando la liveness (`hostId`/`runtimeId`) en `AgentInstance`, con fachada `store.host.*`, reducer para `host.*`/`runtime.*` y superficie en el playground. Solo control-plane; sin proceso host real.

## Technical Context

**Language/Version**: TypeScript 5.6 (ESNext, strict).
**Primary Dependencies**: ninguna nueva (dominio puro + Vitest + Vite ya presentes).
**Storage**: N/A (estado in-memory en `CampusStore`; persistencia data-driven futura).
**Testing**: Vitest (`packages/campus-engine/test`).
**Target Platform**: engine agnóstico; cliente web (playground) para demo.
**Project Type**: monorepo (engine + playground).
**Constraints**: reducer puro/idempotente; `domain/` sin imports de render/store.

## Constitution Check

- **I Core autoritativo**: hosts/runtimes viven en el core; el cliente solo proyecta. ✅
- **II Tres planos**: `domain/host.ts` (modelo) sin render; fachada en store; UI solo proyección. ✅
- **III runtime propone / core dispone**: `spawnRuntime`/`stopRuntime` son comandos validados que emiten eventos. ✅
- **IV Command/Event**: eventos `host.*`/`runtime.*` ya en el union; `reduce` idempotente. ✅
- **V Fachada por entidad**: nueva entidad `host` → `store.host.*` (constructor puro + método + case en reduce). ✅
- **VI Test-gate**: cada FR con test Vitest antes de converge. ✅
- **VII Coherencia/no-espagueti**: mismo patrón que building/room/agent/worker. ✅

Sin violaciones → sin Complexity Tracking.

## Project Structure

```text
specs/001-host-runtime/
├── spec.md
├── plan.md          # este archivo
└── tasks.md

packages/campus-engine/src/
├── domain/host.ts               # + workingDir, buildAgentHost, buildAgentRuntime
└── store/CampusStore.ts         # + hosts/runtimes state, store.host.*, reducer
packages/campus-engine/test/
└── host.test.ts                 # nuevo
apps/playground/src/
├── app.ts                       # seed host + runtime
└── screens/gamification.ts      # panel Hosts + indicador "vivo"
```

**Structure Decision**: monorepo existente; la entidad `host` sigue el patrón de fachada por entidad ya establecido (building/room/agent/worker). Eventos ya definidos en `types.ts`; solo se añade `workingDir` a `AgentRuntime`/`HostSpawnRequest`.

## Phase 0 — research

Sin incógnitas: eventos `host.joined/left/heartbeat` y `runtime.started/stopped` ya existen; `AgentInstance.hostId/runtimeId` ya existen. Decisiones cerradas en Clarifications de la spec.

## Phase 1 — design (contratos)

Fachada (ver spec §Contrato). Estado nuevo: `hosts: AgentHost[]`, `runtimes: AgentRuntime[]`. Getters: `hosts/runtimes/runtimesOf/getHost/liveAgents/isAlive`.

## Phase 2 — tasks

Ver [tasks.md](./tasks.md).
