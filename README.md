# Agent Campus

Gamified campus for AI agents — **WorkAdventure** for spatial presentation; **`engine/`** for domain authority.

## Status

**v0.18** — Layout: `engine/` ambient + `workadventure/` submodule `@ v1.33.5`. Godot/viewer removed.

| Layer | Choice |
|-------|--------|
| Spatial presentation | **WorkAdventure** + `engine/apps/wa-bridge` |
| Domain / API | `@agent-campus/engine` + `engine/apps/server` / `api` |
| Config UI | `engine/apps/control-panel` |
| Specs | [Spec Kit](https://github.com/github/spec-kit) — [`specs/INDEX.md`](specs/INDEX.md) |
| Vendor WA | submodule — **do not edit**; see [`docs/WORKADVENTURE.md`](docs/WORKADVENTURE.md) |

```bash
git submodule update --init
cd engine && npm install
cd .. && npm run typecheck && npm test && npm run build
```

Canonical: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md) · Agents: [`AGENTS.md`](AGENTS.md)
