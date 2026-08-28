# Quickstart: Agent Campus MVP validation

**Feature**: `specs/001-agent-campus-mvp`  
**Goal**: Prove domain rules + (as available) API/Compose + Godot projection against the spec’s success criteria.

## Prerequisites

- Node/npm (or pnpm) for `packages/campus-engine` tests
- Docker (for Compose) when validating API stack
- Godot 4.x when validating client scenes (optional until stub exists)

## 1. Domain rules (always runnable first)

From repo root:

```bash
# Install / test domain package once package scripts exist
cd packages/campus-engine && npm test
```

**Expect** (as tests are added per tasks):

- Spawn named agent → home workspace resolution
- Reject cross-building move without call
- Accept call → corresponding office → close → home
- Same-rank debate OK; cross-rank / skip hierarchy rejected
- Only supervisor evaluates; only `ic` spawns/destroys own workers
- Library classifications resolve by `skill.key`

Map these to [data-model.md](./data-model.md) and [contracts/campus-api.md](./contracts/campus-api.md) error codes.

## 2. Compose API smoke (when API wired)

```bash
cd deploy/compose
cp -n .env.example .env
./run.sh   # or docker compose up
```

Then:

1. `GET /v1/campuses/:id/snapshot` → sample campus
2. `POST .../agents` → instantiate from catalog
3. Open WS `/v1/ws` → observe `agent.instantiated` / `agent.homing`
4. Issue/accept/close call → location events
5. Enable Spec Kit → phase + artifact upsert events

See [contracts/campus-events.md](./contracts/campus-events.md).

## 3. Godot client smoke

1. Open `apps/campus-godot` in Godot 4
2. Run main scene against local API
3. Switch surfaces: gamification → org_tasks → chats
4. Instantiate agent from catalog UI; confirm sprite in home office
5. Export desktop (and web or one mobile target) once stub is playable

**Expect**: SC-001 / SC-004 / SC-008 from [spec.md](./spec.md).

## 4. Acceptance traceability

| Success criterion | Validation path |
|-------------------|-----------------|
| SC-001 spawn journey &lt; 5 min | Manual Godot + sample data |
| SC-002 no move without call | Domain/API tests |
| SC-003 hierarchy battery | Domain tests |
| SC-004 three surfaces | Godot manual |
| SC-005 call round-trip | Domain/API + events |
| SC-006 Spec Kit path | API smoke |
| SC-007 library by craft cross-building | Domain/API |
| SC-008 desktop + web/mobile | Godot export |

## Out of scope for this quickstart

- CLI host join/runtime
- Production TLS hardening beyond Compose Caddy sample
- Full MemPalace production cluster (local/dev adapter acceptable for MVP)
