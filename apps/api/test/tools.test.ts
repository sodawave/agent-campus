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
    expect(data.buildings).toContain("Alpha");
    expect(data.agents.map((a: { id: string }) => a.id)).toEqual(["sup", "ic1"]);
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
