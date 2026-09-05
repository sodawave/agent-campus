# WorkAdventure MCP — feasibility

**Status:** implemented in spec **048** (`npm run mcp:wa` / `@agent-campus/wa-bridge` mcp entry).

## Verdict

A **campus-owned MCP server** wraps existing surfaces. There is **no** official WorkAdventure MCP upstream.

Core tools live in [`engine/apps/wa-bridge/src/mcp/`](../engine/apps/wa-bridge/src/mcp/) (JoinRoom / move / say / leave / list + map-storage upload via `scripts/wa/`). Do **not** fork or edit the `workadventure/` submodule.

## Surface matrix

| WA surface | MCP tools? | Notes |
|---|---|---|
| Pusher WS + protobuf via wa-bridge | **Yes — primary** | `wa_agent_*` tools |
| map-storage upload | Yes — `wa_map_upload` | Shells to `scripts/wa/upload-starter-to-map-storage.sh` |
| Admin API | Partial / later | WA calls campus |
| Scripting API | No as fleet | — |
| Upstream WA MCP | None | — |

## Tools (048)

- `wa_agent_join` / `wa_agent_leave`
- `wa_agent_move` / `wa_agent_say`
- `wa_agents_list` / `wa_room_url`
- `wa_map_upload`

## Constraints

- Submodule read-only ([WORKADVENTURE.md](./WORKADVENTURE.md)).
- Domain authority remains `@agent-campus/engine`; MCP is presentation/ops only.
- AGPL + Commons Clause on WA — private campus use OK; do not resell WA as SaaS.
