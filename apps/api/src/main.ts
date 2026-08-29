/**
 * campus-mcp — MCP server around the campus core. Connects to the core over
 * WebSocket and serves the campus tools over stdio (for AI harnesses). No auth
 * yet (the connection token will be defined later in the Control Panel).
 */

import { createWsCampusLink } from "./link";
import { startStdioServer } from "./server";

const URL = process.env.CAMPUS_URL ?? "ws://localhost:8787";

async function main(): Promise<void> {
  const link = await createWsCampusLink(URL);
  // stderr so we don't corrupt the stdio MCP channel on stdout.
  console.error(`[campus-mcp] connected to core ${URL}; serving tools over stdio`);
  await startStdioServer(link);
}

main().catch((err) => {
  console.error(`[campus-mcp] fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
