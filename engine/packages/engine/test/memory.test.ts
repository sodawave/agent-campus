import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.building.spawn({ id: "b2", name: "Beta" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.room.spawn({ id: "r2", buildingId: "b2", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" });
  store.agent.instantiate({ id: "a2", name: "Ivan", buildingId: "b2", roomId: "r2" });
  return store;
}

describe("memory.remember + effective recall", () => {
  it("stores agent-scope and project-scope records", () => {
    const store = seededStore();
    expect(store.memory.remember({ id: "m1", scope: "agent", ownerId: "a1", text: "note A" }).ok).toBe(true);
    expect(store.memory.remember({ id: "m2", scope: "project", ownerId: "b1", text: "proj memory" }).ok).toBe(true);
    expect(store.state().memories).toHaveLength(2);
    expect(store.state().memories[0]).toMatchObject({ id: "m1", scope: "agent", room: "_general" });
  });

  it("recall = own agent memory + current building's project memory", () => {
    const store = seededStore();
    store.memory.remember({ id: "m1", scope: "agent", ownerId: "a1", text: "mia private" });
    store.memory.remember({ id: "m2", scope: "project", ownerId: "b1", text: "alpha shared" });
    store.memory.remember({ id: "m3", scope: "project", ownerId: "b2", text: "beta shared" });
    store.memory.remember({ id: "m4", scope: "agent", ownerId: "a2", text: "ivan private" });

    const recall = store.memory.recall("a1").map((m) => m.id).sort();
    expect(recall).toEqual(["m1", "m2"]); // a1 in b1: own + b1 project (not b2, not a2)
  });

  it("recall follows the agent when loaned to another building", () => {
    const store = seededStore();
    store.room.spawn({ id: "r1b", buildingId: "b2", key: "guest" });
    store.memory.remember({ id: "m2", scope: "project", ownerId: "b2", text: "beta shared" });
    // move a1 to b2 via ProjectCall
    store.agent.callToBuilding({ id: "call1", agentId: "a1", toBuildingId: "b2", toRoomId: "r1b" });
    const recall = store.memory.recall("a1").map((m) => m.id);
    expect(recall).toContain("m2"); // now sees Beta's project memory
  });

  it("rejects duplicate id and unknown owner", () => {
    const store = seededStore();
    store.memory.remember({ id: "m1", scope: "agent", ownerId: "a1", text: "x" });
    expect(store.memory.remember({ id: "m1", scope: "agent", ownerId: "a1", text: "y" })).toEqual({ ok: false, reason: "duplicate_id" });
    expect(store.memory.remember({ id: "m9", scope: "agent", ownerId: "ghost", text: "x" })).toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.memory.remember({ id: "m9", scope: "project", ownerId: "ghost", text: "x" })).toEqual({ ok: false, reason: "building_not_found" });
  });
});
