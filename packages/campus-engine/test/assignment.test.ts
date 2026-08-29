import { describe, expect, it } from "vitest";
import { CampusStore, agentsForProject, projectsForAgent } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Empresa A" });
  store.building.spawn({ id: "b2", name: "Empresa B" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.room.spawn({ id: "r2", buildingId: "b2", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Ada", buildingId: "b1", roomId: "r1" });
  store.agent.instantiate({ id: "a2", name: "Ben", buildingId: "b2", roomId: "r2" });
  store.project.create({ id: "p1", buildingId: "b1", name: "A1" });
  store.project.create({ id: "p2", buildingId: "b2", name: "B1" });
  return store;
}

describe("project.assign / unassign (agent ↔ project, N:N)", () => {
  it("assigns an agent to a project in its building; project appears on the agent", () => {
    const store = seeded();
    const res = store.project.assign({ agentId: "a1", projectId: "p1" });
    expect(res.ok).toBe(true);
    expect(projectsForAgent(store.state(), "a1").map((p) => p.id)).toEqual(["p1"]);
    expect(agentsForProject(store.state(), "p1").map((a) => a.id)).toEqual(["a1"]);
  });

  it("supports N:N (agent in several projects, project with several agents)", () => {
    const store = seeded();
    store.project.create({ id: "p1b", buildingId: "b1", name: "A2" });
    store.agent.instantiate({ id: "a3", name: "Cid", buildingId: "b1", roomId: "r1" });
    store.project.assign({ agentId: "a1", projectId: "p1" });
    store.project.assign({ agentId: "a1", projectId: "p1b" });
    store.project.assign({ agentId: "a3", projectId: "p1" });
    expect(projectsForAgent(store.state(), "a1").map((p) => p.id).sort()).toEqual(["p1", "p1b"]);
    expect(agentsForProject(store.state(), "p1").map((a) => a.id).sort()).toEqual(["a1", "a3"]);
  });

  it("rejects cross-building assignment, unknown agent/project, and double assign", () => {
    const store = seeded();
    expect(store.project.assign({ agentId: "a1", projectId: "p2" })).toEqual({ ok: false, reason: "project_not_in_building" });
    expect(store.project.assign({ agentId: "ghost", projectId: "p1" })).toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.project.assign({ agentId: "a1", projectId: "nope" })).toEqual({ ok: false, reason: "project_not_found" });
    store.project.assign({ agentId: "a1", projectId: "p1" });
    expect(store.project.assign({ agentId: "a1", projectId: "p1" })).toEqual({ ok: false, reason: "already_assigned" });
  });

  it("unassign removes the link; rejects when not assigned", () => {
    const store = seeded();
    store.project.assign({ agentId: "a1", projectId: "p1" });
    expect(store.project.unassign({ agentId: "a1", projectId: "p1" }).ok).toBe(true);
    expect(projectsForAgent(store.state(), "a1")).toEqual([]);
    expect(store.project.unassign({ agentId: "a1", projectId: "p1" })).toEqual({ ok: false, reason: "not_assigned" });
  });
});
