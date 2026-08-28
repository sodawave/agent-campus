# Agent Campus

Gamified campus for AI agent harnesses: buildings (= projects), offices (= departments), org chart, task inventory, and agent chats.

## Status

Domain / tech spec **v0.9** (engine not scaffolded yet).

| Screen | Role |
|--------|------|
| Gamification | Pixel campus map; anonymous workers enter/leave |
| Org / tasks | Mindmap organigram + task inventory + orders |
| Chats | Conversations with named agents |

Canonical write-up: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md)

## Repo layout

```
docs/TECH_SPEC.md
packages/campus-engine/src/
  domain/     # types, context, org, library, tasks, workers
  catalog/    # sample catalog + library
  layouts/    # sample project + building layout
assets/       # reference UI capture
```

## Continue from the portable bundle

If you do not have GitHub access from the cloud agent yet:

```bash
git clone agent-campus-latest.bundle agent-campus
cd agent-campus
```

## Publish to GitHub (when `GH_TOKEN` is set)

```bash
export GH_TOKEN=…   # repo scope
./scripts/publish-github.sh
```

Creates public repo `agent-campus` (display name **Agent Campus**) under the authenticated user and pushes `main`.
