import { describe, expect, it } from "vitest";
import { CampusStore, agentsForProject, projectsForAgent } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Empresa A" }); // leader = "b1-leader-agent"
  return store;
}

describe("project.create auto-assigns the building leader (context)", () => {
  it("assigns the leader to the new project (normal, removable assignment)", () => {
    const store = seeded();
    store.project.create({ id: "p1", buildingId: "b1", name: "X" });
    expect(agentsForProject(store.state(), "p1").map((a) => a.id)).toContain("b1-leader-agent");
    expect(projectsForAgent(store.state(), "b1-leader-agent").map((p) => p.id)).toContain("p1");
  });

  it("the leader assignment is removable (no obligation)", () => {
    const store = seeded();
    store.project.create({ id: "p1", buildingId: "b1", name: "X" });
    expect(store.project.unassign({ agentId: "b1-leader-agent", projectId: "p1" }).ok).toBe(true);
    expect(agentsForProject(store.state(), "p1").map((a) => a.id)).not.toContain("b1-leader-agent");
  });

  it("does not duplicate if the leader is (re)assigned", () => {
    const store = seeded();
    store.project.create({ id: "p1", buildingId: "b1", name: "X" });
    // already assigned by create -> explicit assign should be rejected as already_assigned
    expect(store.project.assign({ agentId: "b1-leader-agent", projectId: "p1" })).toEqual({ ok: false, reason: "already_assigned" });
    expect(agentsForProject(store.state(), "p1").filter((a) => a.id === "b1-leader-agent")).toHaveLength(1);
  });
});
