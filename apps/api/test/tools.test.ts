import { describe, expect, it } from "vitest";
import {
  CampusClient,
  CampusServer,
  createInMemoryPair,
} from "@agent-campus/campus-engine";
import { tools } from "../src/tools";
import type { CampusLink } from "../src/link";

/** In-memory link to a seeded core (no network). */
function memLink(): CampusLink {
  const server = new CampusServer();
  const s = server.store;
  s.campus.load({ id: "c1", name: "Demo Co" });
  s.building.spawn({ id: "b1", name: "Alpha" });
  s.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  s.agent.instantiate({ id: "sup", name: "Sara", buildingId: "b1", roomId: "r1", rankKey: "lead" });
  s.agent.instantiate({ id: "ic1", name: "Ada", buildingId: "b1", roomId: "r1", rankKey: "ic" });
  s.agent.assignSupervisor({ agentId: "ic1", supervisorId: "sup" });

  const [srv, cli] = createInMemoryPair();
  server.handle(srv);
  const client = new CampusClient(cli);
  return { send: (cmd) => client.send(cmd), state: () => client.state() };
}

function byName(name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}

describe("MCP tools over the campus core", () => {
  it("campus_status reports the seeded projection", async () => {
    const link = memLink();
    const text = await byName("campus_status").run(link, {});
    const data = JSON.parse(text);
    expect(data.campus).toBe("Demo Co");
    expect(data.buildings.map((b: { name: string }) => b.name)).toContain("Alpha");
    // building.spawn is composite: a leader agent is auto-created too.
    const ids = data.agents.map((a: { id: string }) => a.id);
    expect(ids).toContain("sup");
    expect(ids).toContain("ic1");
    expect(ids).toContain("b1-leader-agent");
  });

  it("agent_instantiate adds an agent (ok event)", async () => {
    const link = memLink();
    const res = await byName("agent_instantiate").run(link, {
      id: "a3",
      name: "Nia",
      buildingId: "b1",
      roomId: "r1",
      rankKey: "ic",
    });
    expect(res).toBe("ok: agent.instantiated");
    expect(link.state().agents.some((a) => a.id === "a3")).toBe(true);
  });

  it("worker_spawn by a non-ic actor is rejected", async () => {
    const link = memLink();
    const res = await byName("worker_spawn").run(link, { id: "w1", actorId: "sup", buildingId: "b1", roomId: "r1" });
    expect(res).toBe("rejected: rank_not_allowed");
  });

  it("worker_spawn by an ic actor succeeds", async () => {
    const link = memLink();
    const res = await byName("worker_spawn").run(link, { id: "w1", actorId: "ic1", buildingId: "b1", roomId: "r1" });
    expect(res).toBe("ok: worker.entered");
    expect(link.state().workers).toHaveLength(1);
  });

  it("task lifecycle via tools reaches succeeded through the supervisor", async () => {
    const link = memLink();
    expect(await byName("task_assign").run(link, { id: "t1", title: "Ship", assigneeId: "ic1", orderedById: "sup" })).toBe("ok: task.created");
    expect(await byName("task_start").run(link, { taskId: "t1" })).toBe("ok: task.started");
    expect(await byName("task_submit").run(link, { taskId: "t1" })).toBe("ok: task.submitted");
    expect(await byName("task_evaluate").run(link, { taskId: "t1", evaluatorId: "sup", verdict: "succeeded" })).toBe("ok: task.evaluated");
    expect(link.state().tasks[0]?.status).toBe("succeeded");
  });

  it("task_evaluate by a non-supervisor is rejected", async () => {
    const link = memLink();
    await byName("task_assign").run(link, { id: "t1", title: "Ship", assigneeId: "ic1" });
    await byName("task_start").run(link, { taskId: "t1" });
    await byName("task_submit").run(link, { taskId: "t1" });
    expect(await byName("task_evaluate").run(link, { taskId: "t1", evaluatorId: "ic1", verdict: "succeeded" })).toBe("rejected: not_supervisor");
  });
});

describe("MCP tools — projects, assignment, execution, memory", () => {
  it("project_create + project_assign; status reflects them", async () => {
    const link = memLink();
    expect(await byName("project_create").run(link, { id: "p1", buildingId: "b1", name: "Onboarding" })).toBe("ok: project.created");
    expect(await byName("project_assign").run(link, { agentId: "ic1", projectId: "p1" })).toBe("ok: project.assigned");
    const data = JSON.parse(await byName("campus_status").run(link, {}));
    expect(data.projects.map((p: { id: string }) => p.id)).toContain("p1");
    expect(data.assignments).toContainEqual({ agentId: "ic1", projectId: "p1" });
  });

  it("project_assign before create is rejected", async () => {
    const link = memLink();
    expect(await byName("project_assign").run(link, { agentId: "ic1", projectId: "nope" })).toBe("rejected: project_not_found");
  });

  it("host_join + runtime_start makes the agent live", async () => {
    const link = memLink();
    expect(await byName("host_join").run(link, { id: "h1", label: "box" })).toBe("ok: host.joined");
    expect(await byName("runtime_start").run(link, { id: "rt1", hostId: "h1", agentId: "ic1", workingDir: "/w" })).toBe("ok: runtime.started");
    const data = JSON.parse(await byName("campus_status").run(link, {}));
    expect(data.agents.find((a: { id: string; live: boolean }) => a.id === "ic1")?.live).toBe(true);
  });

  it("memory_remember and building_assign_lead accept", async () => {
    const link = memLink();
    expect(await byName("memory_remember").run(link, { id: "m1", scope: "agent", ownerId: "ic1", text: "note" })).toBe("ok: memory.remembered");
    expect(await byName("building_assign_lead").run(link, { buildingId: "b1", agentId: "ic1" })).toBe("ok: building.lead.assigned");
  });
});
