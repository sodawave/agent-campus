# Agent Campus

Gamified campus for AI agent harnesses — **web + native iOS/Android**.

## Status

Domain / tech spec **v0.14**.

| Layer | Choice |
|-------|--------|
| Map (Stardew-like) | **Godot 4** (`apps/campus-godot`) |
| Product shell | React (web) + Expo (mobile) — org / chats / plugins |
| Domain | TypeScript `packages/campus-engine` |
| Memory | [MemPalace](https://github.com/MemPalace/mempalace) |
| Specs | [Spec Kit](https://github.com/github/spec-kit) |
| Deploy / comms | Compose + WS/Redis ([Buzz-inspired](https://github.com/block/buzz/tree/main/deploy/compose)) |
| CLI hosts | Planned, **low priority** |

Godot renders the campus; it does **not** own business rules (bridge ↔ API).

Canonical write-up: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md)

## Repo

https://github.com/sodawave/agent-campus
