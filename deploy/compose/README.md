# Agent Campus — Compose deployment (inspired by block/buzz)

Single-node / VPS bundle for the campus API and agent communication bus.
Pattern adapted from [block/buzz `deploy/compose`](https://github.com/block/buzz/tree/main/deploy/compose):
relay + Postgres + Redis + object storage + optional Caddy TLS + `run.sh`.

## Why this shape

Buzz is a **hive-mind workspace** where humans and agents share one signed event log (Nostr relay). Agent Campus needs the same class of substrate for:

- chats (screen 3)
- orders / task events
- debates between peers
- `ProjectCall` / hierarchy messages
- worker enter/exit signals to the map

We **do not vendor Buzz wholesale** in v0; we reuse the **ops pattern** and keep an optional path to plug a Buzz-compatible relay later (`COMMS_BACKEND=buzz|internal`).

## Quick start (when images exist)

```bash
cd deploy/compose
cp .env.example .env
# replace every CHANGE_ME
./run.sh start
```

TLS:

```bash
CAMPUS_COMPOSE_TLS=true ./run.sh start
```

## Services (target)

| Service | Role |
|---------|------|
| `api` | Campus HTTP + WS (domain events → clients web/ios/android) |
| `postgres` | Durable state (projects, agents, tasks, specs) |
| `redis` | Pub/sub fan-out between agents and UI |
| `minio` | Library blobs / media |
| `mempalace` (opt) | Episodic memory MCP/HTTP for agent+project wings |
| `caddy` (opt) | TLS termination |

## Agent communication

Default: **internal event bus** on `api` + Redis channels scoped by `campusId` / `projectId` / `workspaceId`.

Events already in domain (`CampusEvent`, debates, orders, calls, memory, worker.*) are published on the bus; harnesses and UIs subscribe.

Optional later: `COMMS_BACKEND=buzz` pointing at a Buzz relay for signed agent/human rooms (see Buzz VISION_AGENT).
