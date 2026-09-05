# Agent Campus

Gamified campus for AI agents — **WorkAdventure** for spatial presentation; **campus-engine** for domain authority.

## Status

**v0.17** — Spatial client = WorkAdventure + [`apps/wa-bridge`](apps/wa-bridge). Godot spatial line **deprecated** (see [`docs/WORKADVENTURE.md`](docs/WORKADVENTURE.md)).

| Layer | Choice |
|-------|--------|
| Spatial presentation | **WorkAdventure** + `apps/wa-bridge` (agents as WOKAs) |
| Domain / API | TypeScript `campus-engine` + `apps/server` |
| Config UI | `apps/control-panel` (+ playground for debug) |
| Memory | [MemPalace](https://github.com/MemPalace/mempalace) |
| Specs | [Spec Kit](https://github.com/github/spec-kit) — index [`specs/INDEX.md`](specs/INDEX.md) |
| Deploy | [`deploy/compose`](deploy/compose/) |
| CLI hosts | Low priority |
| ~~Godot~~ | **Deprecated** — `apps/campus-godot` (no new spatial work) |

Canonical write-up: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md) · WA matrix: [`docs/WORKADVENTURE.md`](docs/WORKADVENTURE.md)

https://github.com/sodawave/agent-campus
