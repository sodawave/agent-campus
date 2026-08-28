# Implementation Plan: Agent Campus MVP

**Branch**: `cursor/agent-campus-mvp-2319` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-agent-campus-mvp/spec.md`

## Summary

Deliver the Agent Campus MVP: a Godot 4 client (map + org/tasks + chats) talking to a TypeScript domain/API that owns business rules. Persist campus/project/agent state; enforce home-unless-called mobility, org hierarchy, catalog spawn, library + MemPalace memory, and opt-in Spec Kit per building. Single-node Compose for local ops. CLI hosts deferred.

## Technical Context

**Language/Version**: TypeScript 5.x (domain + API); GDScript / Godot 4.x (client)

**Primary Dependencies**: Hono (HTTP/WS API), Godot 4 2D, MemPalace (episodic memory), Spec Kit (SDD tooling already in-repo), Compose stack

**Storage**: PostgreSQL (canonical state), Redis (pub/sub + ephemeral), object storage (library blobs / MinIO)

**Testing**: Vitest (domain + API unit/contract); Godot scene smoke / manual export checks for client

**Target Platform**: Godot exports — iOS, Android, Desktop (Win/macOS/Linux), Web; API on Linux container

**Project Type**: Multi-surface product — Godot client app + TS monorepo packages + Compose deploy

**Performance Goals**: Map presence updates feel interactive (≤200ms perceived for local/WS events on sample campus); org/chat usable on sample data without lag

**Constraints**: Domain owns truth (clients project only); no free inter-building roam; CLI hosts out of MVP delivery; plugins at API layer only

**Scale/Scope**: One sample campus, ≥1–2 buildings, few dozen agents max for MVP demos; three screens; Spec Kit opt-in path demonstrable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Domain Owns the Truth | Business rules in `packages/campus-engine` + API; Godot projects state only | PASS (design) |
| II. Godot-First Client | Primary app under `apps/campus-godot`; one project → multi-export | PASS |
| III. Three Work Surfaces | Map, org/tasks, chats as first-class scenes/flows | PASS |
| IV. Agents Stay Home Unless Called | `ProjectCall` required for cross-building; craft unchanged on visit | PASS |
| V. Memory Is Layered | Library by craft + MemPalace agent/project scopes | PASS |
| VI. Hierarchy Is Enforceable | Peer debate, no skip, supervisor eval, `ic` workers | PASS |
| VII. Spec-Driven Buildings | Opt-in Spec Kit per project; CLI hosts deferred | PASS |

**Post-Phase 1 re-check**: Contracts place mutations on API/domain events; Godot contracts are read/project + intent requests only. No unjustified complexity beyond existing monorepo split (engine / api / godot / compose).

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-campus-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── campus-api.md
│   └── campus-events.md
└── tasks.md                 # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
apps/
└── campus-godot/            # Godot 4 client (map, org, chats)
packages/
├── campus-engine/           # Pure domain types + rules
│   └── src/domain/
├── campus-api/              # Hono HTTP/WS (to scaffold/extend)
└── campus-cli/              # Deferred host CLI (contract only)
deploy/
└── compose/                 # api, postgres, redis, minio, caddy
docs/
└── TECH_SPEC.md             # Living product/tech notes
specs/
└── 001-agent-campus-mvp/    # This Spec Kit feature
```

**Structure Decision**: Keep the existing monorepo: domain package as source of truth, new/extended API package for persistence + bus, Godot app as sole primary client, Compose for single-node run. Do not introduce a separate React/Expo mobile shell for MVP.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
