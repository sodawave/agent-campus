# WorkAdventure MCP — feasibility

**Status:** analysis only (spec 047). No implementation in this lot.

## Verdict

A **campus-owned MCP server** that wraps existing surfaces is viable. There is **no** official WorkAdventure MCP upstream.

Recommended core: thin tools over [`engine/apps/wa-bridge`](../engine/apps/wa-bridge) (JoinRoom / move / say / hold) + optional map-storage HTTP (`scripts/wa/`). Do **not** fork or edit the `workadventure/` submodule.

## Surface matrix

| WA surface | MCP tools? | Notes |
|---|---|---|
| Pusher WS + protobuf via wa-bridge | **Yes — primary** | Agent embodiment already here |
| map-storage upload / list | Yes — ops | Replaces hand-editing maps |
| Admin API (`/api/map`, `/api/room/access`, `/api/woka/list`) | Partial | **WA calls campus**; campus implements Admin API — not a driver of agents |
| Scripting API (`WA.*` in map) | No as fleet | In-browser; do not dual-fleet with wa-bridge |
| Upstream WA MCP | None | Confirmed absent |

## Suggested future tools (048+)

- `wa.agent.join` / `wa.agent.leave`
- `wa.agent.move` / `wa.agent.say`
- `wa.map.upload` / `wa.room.url`
- Read-only: `wa.agents.list` (from bridge state)

## Constraints

- Submodule read-only ([WORKADVENTURE.md](./WORKADVENTURE.md)).
- Domain authority remains `@agent-campus/engine`; MCP is presentation/ops only.
- AGPL + Commons Clause on WA — MCP that drives self-hosted play is fine for private campus; do not resell WA as SaaS.
