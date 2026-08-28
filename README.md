# Agent Campus

Gamified campus for AI agent harnesses: buildings (= projects), offices (= departments), org chart, task inventory, agent chats, and **agent memory**.

## Status

Domain / tech spec **v0.10** (engine not scaffolded yet).

| Screen | Role |
|--------|------|
| Gamification | Pixel campus map; anonymous workers enter/leave |
| Org / tasks | Mindmap organigram + task inventory + orders |
| Chats | Conversations with named agents |

**Memory:** [MemPalace](https://github.com/MemPalace/mempalace) — local-first verbatim memory (palace → wing → room → drawer). Documentary RAG stays in the campus Library (by craft); MemPalace holds episodic/conversational memory per agent.

Canonical write-up: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md)

## Repo layout

```
docs/TECH_SPEC.md
packages/campus-engine/src/
  domain/     # types, context, org, library, tasks, workers, memory
  catalog/    # sample catalog + library
  layouts/    # sample project + building layout
assets/       # reference UI capture
```

## MemPalace

```bash
# optional local palace for agents
uv tool install mempalace
mempalace init ~/.mempalace/agent-campus
```

Agent Campus talks to MemPalace through `AgentMemoryPort` (`remember` / `recall`). See `packages/campus-engine/src/domain/memory.ts`.

## GitHub

Repo: https://github.com/sodawave/agent-campus
