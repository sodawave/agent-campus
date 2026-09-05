import { describe, expect, it } from "vitest";
import {
  CampusStore,
  EMPTY_STATE,
  buildBuilding,
  buildCampus,
  isLeaderRoom,
  reduceAll,
  LEADER_RANK_KEY,
} from "../src/index";

function withCampus() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Mi Campus" });
  return store;
}

describe("building.spawn is composite (Entorno + Leader office + Leader agent)", () => {
  it("creates the building, a leader room (role leader) and a leader agent; lead = leader", () => {
    const store = withCampus();
    const res = store.building.spawn({ id: "casa", name: "Casa" });
    expect(res.ok).toBe(true);

    const b = store.state().buildings.find((x) => x.id === "casa")!;
    expect(b.name).toBe("Casa");
    expect(b.leaderAgentId).toBe("casa-leader-agent");

    const leaderRoom = store.state().rooms.find((r) => r.id === "casa-leader")!;
    expect(leaderRoom).toMatchObject({ buildingId: "casa", role: "leader" });
    expect(isLeaderRoom(leaderRoom)).toBe(true);

    const leaderAgent = store.state().agents.find((a) => a.id === "casa-leader-agent")!;
    expect(leaderAgent).toMatchObject({ buildingId: "casa", roomId: "casa-leader", kind: "named", rankKey: LEADER_RANK_KEY });
  });

  it("emits a single building.spawned event (log length +1)", () => {
    const store = withCampus();
    const before = store.log().length;
    store.building.spawn({ id: "casa", name: "Casa" });
    expect(store.log().length).toBe(before + 1);
    expect(store.log().at(-1)?.type).toBe("building.spawned");
  });

  it("derives leader room/agent ids from the building id", () => {
    const store = withCampus();
    store.building.spawn({ id: "empresa-a", name: "Empresa A" });
    expect(store.state().rooms.some((r) => r.id === "empresa-a-leader" && r.role === "leader")).toBe(true);
    expect(store.state().agents.some((a) => a.id === "empresa-a-leader-agent")).toBe(true);
  });

  it("accepts a custom leaderName for the auto-created leader agent", () => {
    const store = withCampus();
    store.building.spawn({ id: "casa", name: "Casa", leaderName: "Aria" });
    expect(store.state().agents.find((a) => a.id === "casa-leader-agent")?.name).toBe("Aria");
  });
});

describe("building.updateContext", () => {
  it("sets the environment context", () => {
    const store = withCampus();
    store.building.spawn({ id: "casa", name: "Casa" });
    expect(store.building.updateContext({ buildingId: "casa", context: "Somos una familia" }).ok).toBe(true);
    expect(store.state().buildings.find((b) => b.id === "casa")?.context).toBe("Somos una familia");
  });
  it("rejects unknown building", () => {
    const store = withCampus();
    expect(store.building.updateContext({ buildingId: "nope", context: "x" })).toEqual({ ok: false, reason: "building_not_found" });
  });
});

describe("building.assignLead", () => {
  it("assigns a lead that belongs to the building", () => {
    const store = withCampus();
    store.building.spawn({ id: "casa", name: "Casa" });
    store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "casa", roomId: "casa-leader" });
    expect(store.building.assignLead({ buildingId: "casa", agentId: "a1" }).ok).toBe(true);
    expect(store.state().buildings.find((b) => b.id === "casa")?.leaderAgentId).toBe("a1");
  });
  it("rejects unknown building, unknown agent, and agent from another building", () => {
    const store = withCampus();
    store.building.spawn({ id: "casa", name: "Casa" });
    store.building.spawn({ id: "otra", name: "Otra" });
    store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "otra", roomId: "otra-leader" });
    expect(store.building.assignLead({ buildingId: "nope", agentId: "a1" })).toEqual({ ok: false, reason: "building_not_found" });
    expect(store.building.assignLead({ buildingId: "casa", agentId: "ghost" })).toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.building.assignLead({ buildingId: "casa", agentId: "a1" })).toEqual({ ok: false, reason: "agent_not_in_building" });
  });
});

describe("reduce tolerance (raw events)", () => {
  it("a raw building.spawned with only the building adds just the building (no leader)", () => {
    const s = reduceAll(EMPTY_STATE, [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "C" }) },
      { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "B" }) },
    ]);
    expect(s.buildings.map((b) => b.id)).toEqual(["b1"]);
    expect(s.rooms).toEqual([]);
    expect(s.agents).toEqual([]);
  });
  it("context/lead events for an unknown building are ignored", () => {
    const base = reduceAll(EMPTY_STATE, [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "C" }) },
    ]);
    expect(reduceAll(base, [{ type: "building.context.updated", buildingId: "ghost", context: "x" }])).toBe(base);
    expect(reduceAll(base, [{ type: "building.lead.assigned", buildingId: "ghost", agentId: "x" }])).toBe(base);
  });
});
