import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { z, type ZodRawShape } from "zod";
import { loadConfig } from "../config";
import { joinWaSession } from "../waSession";
import type { WaBridgeConfig } from "../types";
import { WaMcpRegistry } from "./registry";

const execFileAsync = promisify(execFile);

export interface WaTool {
  name: string;
  description: string;
  input: z.ZodObject<ZodRawShape>;
  run(args: unknown): Promise<string>;
}

const tool = <S extends ZodRawShape>(
  name: string,
  description: string,
  shape: S,
  run: (args: z.infer<z.ZodObject<S>>) => Promise<string>,
): WaTool => ({
  name,
  description,
  input: z.object(shape) as unknown as z.ZodObject<ZodRawShape>,
  run: (args) => run(z.object(shape).parse(args)),
});

function repoRootFromHere(): string {
  // .../engine/apps/wa-bridge/src/mcp → repo root = 5 levels up
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../");
}

export function buildWaTools(
  registry: WaMcpRegistry,
  cfg: WaBridgeConfig = loadConfig(),
  deps: {
    join?: typeof joinWaSession;
    uploadScript?: string;
    exec?: typeof execFileAsync;
  } = {},
): WaTool[] {
  const join = deps.join ?? joinWaSession;
  const uploadScript =
    deps.uploadScript ?? path.join(repoRootFromHere(), "scripts/wa/upload-starter-to-map-storage.sh");
  const exec = deps.exec ?? execFileAsync;

  return [
    tool("wa_agents_list", "List agents currently joined via this WA MCP process.", {}, async () =>
      JSON.stringify({ roomUrl: cfg.waRoomUrl, agents: registry.list() }, null, 2),
    ),

    tool("wa_room_url", "Return the configured WorkAdventure room URL.", {}, async () =>
      JSON.stringify({ roomUrl: cfg.waRoomUrl, playUrl: cfg.waPlayUrl }),
    ),

    tool(
      "wa_agent_join",
      "Join a named agent into the WA room (anonymous JoinRoom). MCP owns movement (no idle wander).",
      { id: z.string().min(1), name: z.string().min(1) },
      async (a) => {
        if (registry.get(a.id)) {
          return JSON.stringify({ ok: false, reason: "already_joined", id: a.id });
        }
        const session = await join(
          {
            id: a.id,
            name: a.name,
            kind: "named",
            buildingId: "mcp",
            roomId: "mcp",
          },
          cfg,
          {
            startIdle: false,
            onDisconnect: () => {
              registry.delete(a.id);
            },
          },
        );
        registry.set(session);
        const p = session.position();
        return JSON.stringify({
          ok: true,
          id: session.agentId,
          name: session.name,
          x: p.x,
          y: p.y,
          roomUrl: cfg.waRoomUrl,
        });
      },
    ),

    tool(
      "wa_agent_leave",
      "Leave the WA room and close the agent session.",
      { id: z.string().min(1) },
      async (a) => {
        const ok = registry.delete(a.id);
        return JSON.stringify({ ok, id: a.id });
      },
    ),

    tool(
      "wa_agent_move",
      "Move an MCP-joined agent to pixel coordinates on the map.",
      {
        id: z.string().min(1),
        x: z.number(),
        y: z.number(),
        moving: z.boolean().optional(),
      },
      async (a) => {
        const s = registry.get(a.id);
        if (!s) return JSON.stringify({ ok: false, reason: "not_joined", id: a.id });
        s.moveTo(a.x, a.y, a.moving ?? true);
        const p = s.position();
        return JSON.stringify({ ok: true, id: a.id, x: p.x, y: p.y, zone: s.zone() });
      },
    ),

    tool(
      "wa_agent_say",
      "Show a speech bubble for an MCP-joined agent.",
      { id: z.string().min(1), message: z.string().min(1).max(280) },
      async (a) => {
        const s = registry.get(a.id);
        if (!s) return JSON.stringify({ ok: false, reason: "not_joined", id: a.id });
        s.say(a.message);
        return JSON.stringify({ ok: true, id: a.id, message: a.message });
      },
    ),

    tool(
      "wa_map_upload",
      "Upload the starter map to map-storage (enables /~/ editor rooms). Does not modify the WA submodule.",
      { directory: z.string().optional() },
      async (a) => {
        const env = {
          ...process.env,
          ...(a.directory ? { MAP_STORAGE_DIRECTORY: a.directory } : {}),
        };
        try {
          const { stdout, stderr } = await exec("bash", [uploadScript], {
            env,
            maxBuffer: 2 * 1024 * 1024,
          });
          return JSON.stringify({
            ok: true,
            stdout: stdout.trim(),
            stderr: stderr.trim() || undefined,
            roomHint: `http://play.workadventure.localhost/~/${a.directory ?? "campus"}/starter/map.wam`,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return JSON.stringify({ ok: false, reason: msg });
        }
      },
    ),
  ];
}
