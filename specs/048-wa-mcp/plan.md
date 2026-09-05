# Plan 048 — WA MCP

**Branch**: `opencode/spec-048-wa-mcp`

## Approach

MCP server **inside** `@agent-campus/wa-bridge` (same JoinRoom stack). Session
registry owned by MCP process; `startIdle: false` so tools own movement.
`wa_map_upload` shells out to `scripts/wa/upload-starter-to-map-storage.sh`.

## Files

- `engine/apps/wa-bridge/src/mcp/{registry,tools,server,main}.ts`
- `engine/apps/wa-bridge/test/mcp.tools.test.ts`
- package.json: deps MCP SDK + zod; scripts `mcp`
