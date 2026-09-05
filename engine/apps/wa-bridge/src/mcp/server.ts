import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../config";
import { WaMcpRegistry } from "./registry";
import { buildWaTools } from "./tools";

export function buildWaMcpServer(registry = new WaMcpRegistry(), cfg = loadConfig()): McpServer {
  const server = new McpServer({ name: "workadventure", version: "0.1.0" });
  for (const t of buildWaTools(registry, cfg)) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.input.shape },
      async (args: unknown) => {
        const text = await t.run(args);
        return { content: [{ type: "text" as const, text }] };
      },
    );
  }
  return server;
}

export async function startWaMcpStdio(): Promise<WaMcpRegistry> {
  const registry = new WaMcpRegistry();
  const server = buildWaMcpServer(registry);
  await server.connect(new StdioServerTransport());
  return registry;
}
