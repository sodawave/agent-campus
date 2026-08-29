/**
 * MCP tool registry for the Agent Campus core. Each tool maps to a command (or a
 * read) on the core via a CampusLink. Kept independent of the MCP SDK so the
 * logic is unit-testable; server.ts wires these into the MCP server.
 */

import { z, type ZodRawShape } from "zod";
import type { CommandResult } from "@agent-campus/campus-engine";
import type { CampusLink } from "./link";

export interface CampusTool {
  name: string;
  description: string;
  input: z.ZodObject<ZodRawShape>;
  run(link: CampusLink, args: unknown): Promise<string>;
}

function fmt(result: CommandResult): string {
  return result.ok ? `ok: ${result.event.type}` : `rejected: ${result.reason}`;
}

const tool = <S extends ZodRawShape>(
  name: string,
  description: string,
  shape: S,
  run: (link: CampusLink, args: z.infer<z.ZodObject<S>>) => Promise<string>,
): CampusTool => ({
  name,
  description,
  input: z.object(shape) as unknown as z.ZodObject<ZodRawShape>,
  run: (link, args) => run(link, z.object(shape).parse(args)),
});

export const tools: CampusTool[] = [
  tool("campus_status", "Read the current campus projection (summary).", {}, async (link) => {
    const s = link.state();
    return JSON.stringify(
      {
        campus: s.campus?.name ?? null,
        buildings: s.buildings.map((b) => b.name),
        agents: s.agents.map((a) => ({ id: a.id, name: a.name, rank: a.rankKey ?? null, live: a.runtimeId != null })),
        workers: s.workers.length,
        tasks: s.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
        hosts: s.hosts.map((h) => h.label),
      },
      null,
      2,
    );
  }),

  tool(
    "building_spawn",
    "Create a building (project) in the loaded campus.",
    { id: z.string(), name: z.string() },
    async (link, a) => {
      const campusId = link.state().campus?.id ?? "";
      return fmt(await link.send({ type: "building.spawn", building: { id: a.id, campusId, name: a.name } }));
    },
  ),

  tool(
    "room_spawn",
    "Create a room (workspace) in a building.",
    { id: z.string(), buildingId: z.string(), key: z.string() },
    async (link, a) =>
      fmt(await link.send({ type: "room.spawn", room: { id: a.id, buildingId: a.buildingId, key: a.key } })),
  ),

  tool(
    "agent_instantiate",
    "Instantiate a named agent in a room.",
    {
      id: z.string(),
      name: z.string(),
      buildingId: z.string(),
      roomId: z.string(),
      rankKey: z.string().optional(),
      skillKey: z.string().optional(),
    },
    async (link, a) =>
      fmt(
        await link.send({
          type: "agent.instantiate",
          agent: {
            id: a.id,
            name: a.name,
            kind: "named",
            buildingId: a.buildingId,
            roomId: a.roomId,
            ...(a.rankKey !== undefined ? { rankKey: a.rankKey } : {}),
            ...(a.skillKey !== undefined ? { skillKey: a.skillKey } : {}),
          },
        }),
      ),
  ),

  tool(
    "worker_spawn",
    "Spawn an anonymous worker (actor must be an ic-rank agent).",
    { id: z.string(), actorId: z.string(), buildingId: z.string(), roomId: z.string() },
    async (link, a) =>
      fmt(
        await link.send({
          type: "worker.spawn",
          actorId: a.actorId,
          worker: { id: a.id, name: "Worker", kind: "anonymous_worker", buildingId: a.buildingId, roomId: a.roomId, rankKey: "ic", spawnedById: a.actorId },
        }),
      ),
  ),

  tool(
    "task_assign",
    "Assign a task to an agent (queued).",
    { id: z.string(), title: z.string(), assigneeId: z.string(), orderedById: z.string().optional() },
    async (link, a) =>
      fmt(
        await link.send({
          type: "task.assign",
          task: { id: a.id, title: a.title, assigneeId: a.assigneeId, status: "queued", ...(a.orderedById !== undefined ? { orderedById: a.orderedById } : {}) },
        }),
      ),
  ),

  tool("task_start", "Start a queued/needs-revision task.", { taskId: z.string() }, async (link, a) =>
    fmt(await link.send({ type: "task.start", taskId: a.taskId })),
  ),

  tool("task_submit", "Submit a running task for review.", { taskId: z.string() }, async (link, a) =>
    fmt(await link.send({ type: "task.submit", taskId: a.taskId })),
  ),

  tool(
    "task_evaluate",
    "Evaluate a task under review (only the direct supervisor).",
    { taskId: z.string(), evaluatorId: z.string(), verdict: z.enum(["succeeded", "needs_revision"]) },
    async (link, a) =>
      fmt(await link.send({ type: "task.evaluate", taskId: a.taskId, evaluatorId: a.evaluatorId, verdict: a.verdict })),
  ),
];
