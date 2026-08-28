# Research: Agent Campus MVP

**Feature**: `specs/001-agent-campus-mvp`  
**Date**: 2026-08-28

## R1 — Primary client technology

**Decision**: Godot 4 (2D) as the single primary client for map + org + chats; export iOS / Android / Desktop / Web.

**Rationale**: Constitution II; Stardew-like campus needs a real game engine; one project avoids shell sprawl (Expo+WebView+bridge). Org/chats as Control UI in the same app.

**Alternatives considered**:
- Phaser web-only + Expo wrappers — rejected for multi-export friction and weaker native game feel.
- Separate native apps per platform — rejected (maintenance).
- React admin as primary — rejected (optional only).

## R2 — Domain vs client ownership

**Decision**: Pure TypeScript domain in `packages/campus-engine`; API applies rules and emits events; Godot sends intents and projects state.

**Rationale**: Constitution I; multiple surfaces (Godot, future CLI, optional admin) must share one rule set.

**Alternatives considered**:
- Encode org/mobility rules in Godot scripts — rejected (divergence risk).
- Serverless-only without domain package — rejected (harder reuse/testing).

## R3 — Persistence & realtime

**Decision**: PostgreSQL for canonical entities; Redis for pub/sub and short-lived presence; object storage for library binaries; WebSocket (or SSE+WS) event bus from API to clients.

**Rationale**: Aligns with existing `deploy/compose` (Buzz-inspired ops pattern); supports multi-client presence.

**Alternatives considered**:
- SQLite-only — insufficient for multi-client pub/sub at demo scale with shared hosts.
- Pure in-memory — fine for unit tests, not for MVP deploy demo.

## R4 — Mobility & ProjectCall

**Decision**: Default stationed at home; leave only via accepted `ProjectCall`; corresponding office in destination building; return home on call close.

**Rationale**: Constitution IV; matches product ontology already in `domain/context.ts`.

**Alternatives considered**:
- Free roaming between buildings — rejected (chaotic metaphor).
- Soft “visit” without call — rejected (undermines org spatial rules).

## R5 — Memory stack

**Decision**: Campus Library (docs classified by `Skill.key`) for RAG/manuals; MemPalace for episodic memory at agent wing and project wing (`memoryWingId`).

**Rationale**: Constitution V; TECH_SPEC mapping already defined; MemPalace is verbatim episodic store.

**Alternatives considered**:
- Single vector store for everything — rejected (mixes manuals and lived episodes).
- Chat-log-only memory — rejected (no project shared wing).

## R6 — Spec Kit per building

**Decision**: Opt-in `Project.specKit` with phases constitution → specify → plan → tasks → implement → converge; artifacts referenceable from orders/runs.

**Rationale**: Constitution VII (SHOULD); repo already initialized with Spec Kit for this codebase; buildings mirror the same SDD loop.

**Alternatives considered**:
- Mandatory Spec Kit on every project create — deferred (friction for demos).
- External-only specs with no domain link — rejected (agents can’t execute against artifacts).

## R7 — Workers & hierarchy

**Decision**: Only `ic` (lowest rank level) spawns/destroys anonymous workers; peer debate only; no hierarchy skip; supervisor-only evaluation.

**Rationale**: Constitution VI; already encoded in `org.ts` / `workers.ts`.

**Alternatives considered**:
- Highest rank spawns workers — rejected (contradicts “último rango” = lowest level decision).
- Any agent evaluates any task — rejected (breaks org enforcement).

## R8 — CLI hosts

**Decision**: Keep `domain/host.ts` contract; do not implement host join/runtime for MVP delivery.

**Rationale**: Constitution VII + FR-017; avoids blocking Godot/API.

**Alternatives considered**:
- Implement CLI hosts in parallel with Godot — rejected (scope risk).

## R9 — API shape

**Decision**: Resource-oriented HTTP for CRUD/intents + typed `CampusEvent` stream over WS; Godot never writes DB directly.

**Rationale**: Clear audit trail; idempotent event application on clients.

**Alternatives considered**:
- Godot ↔ Postgres direct — rejected (Constitution I).
- GraphQL-only — optional later; REST+events sufficient for MVP.

## Unresolved items

None blocking Phase 1. Product assumptions from `spec.md` (minimal worker UI in org/chat; project memory writable by project agents/operator) carried forward.
