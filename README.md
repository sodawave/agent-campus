# Agent Campus

Gamified campus for AI agent harnesses — **web + native iOS/Android**.

## Status

Domain / tech spec **v0.11**.

| Screen | Role |
|--------|------|
| Gamification | Campus map; anonymous workers enter/leave |
| Org / tasks | Mindmap + inventory + orders |
| Chats | Named-agent threads |

| Concern | Base |
|---------|------|
| Agent + project memory | [MemPalace](https://github.com/MemPalace/mempalace) |
| Project specs (SDD) | [Spec Kit](https://github.com/github/spec-kit) |
| Documentary RAG | Campus Library (by craft) |
| Agent comms / deploy | Internal bus; Compose pattern from [block/buzz](https://github.com/block/buzz/tree/main/deploy/compose) |

Clients share one TypeScript domain (`packages/campus-engine`) over API/WS. Default mobile: **Expo / React Native**.

Deploy sketch: [`deploy/compose/`](deploy/compose/).

Canonical write-up: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md)

Aesthetic refs (non-final):
- Building departments schematic (preferred): `assets/refs/building-departments-schematic-isometric.png`
- Campus clay diorama: `assets/refs/aesthetic-campus-isometric-clay.png`
- Pixel layout capture: `assets/`

## Repo

https://github.com/sodawave/agent-campus
