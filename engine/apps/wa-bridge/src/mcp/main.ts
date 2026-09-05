/**
 * wa-mcp — MCP server for WorkAdventure spatial ops (join/move/say + map upload).
 * Presentation/ops only; domain stays in @agent-campus/engine.
 */

import { startWaMcpStdio } from "./server";

async function main(): Promise<void> {
  console.error("[wa-mcp] serving WorkAdventure tools over stdio");
  await startWaMcpStdio();
}

main().catch((err) => {
  console.error(`[wa-mcp] fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
