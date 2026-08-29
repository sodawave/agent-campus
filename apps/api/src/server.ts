/**
 * MCP server exposing the Agent Campus core as tools for AI harnesses.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools";
import type { CampusLink } from "./link";

export function buildMcpServer(link: CampusLink): McpServer {
  const server = new McpServer({ name: "agent-campus", version: "0.1.0" });
  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.input.shape },
      async (args: unknown) => {
        const text = await t.run(link, args);
        return { content: [{ type: "text" as const, text }] };
      },
    );
  }
  return server;
}

export async function startStdioServer(link: CampusLink): Promise<void> {
  const server = buildMcpServer(link);
  await server.connect(new StdioServerTransport());
}
