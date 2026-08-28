<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: initial adoption
- Added sections: Core Principles (I–VII), Product Constraints, Client & Platform, Governance
- Removed sections: n/a
- Deferred TODOs: none
-->

# Agent Campus Constitution

## Core Principles

### I. Domain Owns the Truth
Business rules (org hierarchy, catalog vs instance, memory scopes, Spec Kit
phases, host/runtime contracts) MUST live in the shared domain and API.
Godot and other clients MUST project state and MUST NOT invent parallel rules.

**Rationale**: One campus, many surfaces — web, mobile, desktop, CLI hosts.

### II. Godot-First Client, Stardew Feel
The primary user-facing product MUST be a Godot 4 2D client with a
Stardew Valley–like campus. One Godot project MUST export to iOS, Android,
desktop (Windows/macOS/Linux), and web. Optional React admin MUST NOT block
the Godot client.

**Rationale**: One client codebase covers the gamified experience and the
three work screens without shell sprawl.

### III. Three Work Surfaces
The product MUST expose three equally first-class surfaces:
1. Gamification (campus map / presence)
2. Organigram / tasks (ops mindmap, inventory, orders)
3. Chats with agents

**Rationale**: Observation, control, and conversation are distinct jobs.

### IV. Agents Stay Home Unless Called
Named agents MUST remain in their natural office by default. They MAY leave
only via an explicit project call (`ProjectCall`). Visiting another room MUST
NOT change their craft reasoning. Cross-building presence requires a call and
corresponding office when available.

**Rationale**: Spatial metaphor mirrors real orgs; prevents chaotic roaming.

### V. Memory Is Layered
Documentary knowledge MUST use the campus Library (by craft). Episodic memory
MUST use MemPalace at agent and project scopes. Craft reasoning always applies;
department specialization is the corresponding office of the current building,
not a random visited room.

**Rationale**: Separates manuals from lived experience; MemPalace is verbatim.

### VI. Hierarchy Is Enforceable
Peers of equal rank MAY debate. Communication and assignment MUST NOT skip
reporting lines. Only a direct supervisor MAY evaluate a report's tasks.
Lowest rank (`ic`) MAY spawn/destroy anonymous workers, visualized as
entering/leaving campus.

**Rationale**: Org chart is operational, not decorative.

### VII. Spec-Driven Buildings
Projects/buildings SHOULD run Spec Kit SDD (constitution → specify → plan →
tasks → implement → converge). Specs are project artifacts agents execute
against. Distributed CLI hosts are deferred (low priority) but the contract
MAY exist without blocking MVP.

**Rationale**: Intent before code; hosts are power features post-MVP.

## Product Constraints

- Plugins and MCP connectors MUST attach at the API/host layer; Godot shows
  panels, not proprietary plugin runtimes.
- Deploy for single-node MUST follow the Compose pattern (API, Postgres,
  Redis, object storage, optional TLS).
- Aesthetic refs in `assets/refs/` are orientative, not binding art direction.
  Stardew-like is the target feel for the map.

## Client & Platform

| Surface | Requirement |
|---------|-------------|
| Godot app | MUST be the primary client for map + org + chats |
| Exports | MUST target iOS, Android, desktop, web from one project |
| Domain | MUST remain TypeScript-consumable by API and tools |
| CLI host | SHOULD ship after MVP; MUST NOT block Godot/API delivery |

## Governance

- This constitution supersedes ad-hoc practice when they conflict.
- Amendments require: documented change, version bump (semver), and update to
  `docs/TECH_SPEC.md` when product rules change.
- PRs that alter hierarchy, memory, or client topology MUST cite the affected
  principle.
- Compliance review: before `/speckit-plan` for major features, re-read this
  file; before release, verify clients still do not own business rules.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
