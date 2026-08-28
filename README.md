# Agent Campus

Gamified campus for AI agents — **Godot-first**.

## Status

**v0.15** — Godot 4 is the **main app** (Stardew-like), exported to **iOS, Android, and Web**.

| Layer | Choice |
|-------|--------|
| Mobile + map + org/chats UI | **Godot 4** (`apps/campus-godot`) |
| Backend domain/API | TypeScript `campus-engine` + Hono + Postgres/Redis |
| Memory | [MemPalace](https://github.com/MemPalace/mempalace) |
| Specs | [Spec Kit](https://github.com/github/spec-kit) |
| Deploy | [`deploy/compose`](deploy/compose/) (Buzz-inspired) |
| CLI hosts | Low priority |
| React admin | Optional |

Canonical write-up: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md)

## Repo

https://github.com/sodawave/agent-campus
