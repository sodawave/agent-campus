/**
 * MCP tool registry for the Agent Campus core. Each tool maps to a command (or a
 * read) on the core via a CampusLink. Kept independent of the MCP SDK so the
 * logic is unit-testable; server.ts wires these into the MCP server.
 */

import { z, type ZodRawShape } from "zod";
import { messagesForAgent, type CommandResult } from "@agent-campus/engine";
import type { CampusLink } from "./link";
import { mapRoomUrl, provisionBuildingMap } from "./mapProvision";

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
        buildings: s.buildings.map((b) => ({
          id: b.id,
          name: b.name,
          leaderAgentId: b.leaderAgentId ?? null,
          waRoomUrl: b.waRoomUrl ?? null,
        })),
        agents: s.agents.map((a) => ({ id: a.id, name: a.name, rank: a.rankKey ?? null, live: a.runtimeId != null })),
        workers: s.workers.length,
        tasks: s.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
        projects: s.projects.map((p) => ({ id: p.id, name: p.name, buildingId: p.buildingId, status: p.status })),
        assignments: s.assignments.map((x) => ({ agentId: x.agentId, projectId: x.projectId })),
        hosts: s.hosts.map((h) => `${h.label}(${h.status})`),
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

  tool(
    "building_update_context",
    "Set the environment (building) context/norms.",
    { buildingId: z.string(), context: z.string() },
    async (link, a) => fmt(await link.send({ type: "building.updateContext", buildingId: a.buildingId, context: a.context })),
  ),

  tool(
    "building_assign_lead",
    "Assign the environment lead (an agent of that building).",
    { buildingId: z.string(), agentId: z.string() },
    async (link, a) => fmt(await link.send({ type: "building.assignLead", buildingId: a.buildingId, agentId: a.agentId })),
  ),

  tool(
    "building_set_wa_room_url",
    "Bind a WorkAdventure map URL to a building (map = building).",
    { buildingId: z.string(), waRoomUrl: z.string().nullable() },
    async (link, a) =>
      fmt(await link.send({ type: "building.setWaRoomUrl", buildingId: a.buildingId, waRoomUrl: a.waRoomUrl })),
  ),

  tool(
    "building_provision_map",
    "Spawn building if needed, upload starter map to map-storage, and bind waRoomUrl.",
    {
      id: z.string(),
      name: z.string(),
      directory: z.string().optional(),
    },
    async (link, a) =>
      provisionBuildingMap(link, {
        id: a.id,
        name: a.name,
        ...(a.directory !== undefined ? { directory: a.directory } : {}),
      }),
  ),

  tool(
    "wa_map_url_for_directory",
    "Compute the /~/ room URL for a map-storage directory (no I/O).",
    { directory: z.string() },
    async (_link, a) => JSON.stringify({ waRoomUrl: mapRoomUrl(a.directory) }),
  ),

  tool(
    "project_create",
    "Create a project in a building's inventory.",
    { id: z.string(), buildingId: z.string(), name: z.string() },
    async (link, a) =>
      fmt(await link.send({ type: "project.create", project: { id: a.id, buildingId: a.buildingId, name: a.name, status: "active" } })),
  ),

  tool("project_archive", "Archive a project.", { projectId: z.string() }, async (link, a) =>
    fmt(await link.send({ type: "project.archive", projectId: a.projectId })),
  ),

  tool(
    "project_assign",
    "Assign an agent to a project (same building).",
    { agentId: z.string(), projectId: z.string() },
    async (link, a) => fmt(await link.send({ type: "project.assign", agentId: a.agentId, projectId: a.projectId })),
  ),

  tool(
    "project_unassign",
    "Unassign an agent from a project.",
    { agentId: z.string(), projectId: z.string() },
    async (link, a) => fmt(await link.send({ type: "project.unassign", agentId: a.agentId, projectId: a.projectId })),
  ),

  tool(
    "host_join",
    "Join a host (machine) to the campus.",
    { id: z.string(), label: z.string() },
    async (link, a) => fmt(await link.send({ type: "host.join", id: a.id, label: a.label })),
  ),

  tool(
    "runtime_start",
    "Start a live runtime for an agent on a host (makes the agent live).",
    { id: z.string(), hostId: z.string(), agentId: z.string(), workingDir: z.string().optional() },
    async (link, a) =>
      fmt(await link.send({ type: "runtime.start", id: a.id, hostId: a.hostId, agentId: a.agentId, ...(a.workingDir !== undefined ? { workingDir: a.workingDir } : {}) })),
  ),

  tool(
    "memory_remember",
    "Store a memory record (scope agent or project).",
    { id: z.string(), scope: z.enum(["agent", "project"]), ownerId: z.string(), text: z.string(), room: z.string().optional() },
    async (link, a) =>
      fmt(await link.send({ type: "memory.remember", record: { id: a.id, scope: a.scope, ownerId: a.ownerId, room: a.room ?? "_general", text: a.text } })),
  ),

  tool(
    "chat_send",
    "Send a chat message to a named agent's thread (from user or agent).",
    { id: z.string(), agentId: z.string(), from: z.enum(["user", "agent"]), text: z.string() },
    async (link, a) =>
      fmt(await link.send({ type: "chat.send", message: { id: a.id, agentId: a.agentId, from: a.from, text: a.text } })),
  ),

  tool(
    "chat_history",
    "Read a named agent's chat thread.",
    { agentId: z.string() },
    async (link, a) =>
      JSON.stringify(
        messagesForAgent(link.state(), a.agentId).map((m) => ({ from: m.from, text: m.text })),
        null,
        2,
      ),
  ),
];
