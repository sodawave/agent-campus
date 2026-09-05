import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

/** Two buildings; agent a1 lives in Alpha/mkt. Beta has a dev room. */
function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "alpha", name: "Alpha" });
  store.building.spawn({ id: "beta", name: "Beta" });
  store.room.spawn({ id: "alpha-mkt", buildingId: "alpha", key: "mkt" });
  store.room.spawn({ id: "beta-dev", buildingId: "beta", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "alpha", roomId: "alpha-mkt", rankKey: "ic" });
  return store;
}

describe("ProjectCall — inter-building loan (moves representation, not execution)", () => {
  it("calling an agent moves it to the calling building/room and records the call", () => {
    const store = seededStore();
    const res = store.agent.callToBuilding({ id: "call1", agentId: "a1", toBuildingId: "beta", toRoomId: "beta-dev" });
    expect(res.ok).toBe(true);
    const a = store.state().agents.find((x) => x.id === "a1")!;
    expect(a.buildingId).toBe("beta");
    expect(a.roomId).toBe("beta-dev");
    expect(a.activeCallId).toBe("call1");
    expect(store.state().calls[0]).toMatchObject({ id: "call1", status: "open", originBuildingId: "alpha", originRoomId: "alpha-mkt" });
  });

  it("returnHome sends the agent back to its origin and closes the call", () => {
    const store = seededStore();
    store.agent.callToBuilding({ id: "call1", agentId: "a1", toBuildingId: "beta", toRoomId: "beta-dev" });
    const res = store.agent.returnHome({ agentId: "a1" });
    expect(res.ok).toBe(true);
    const a = store.state().agents.find((x) => x.id === "a1")!;
    expect(a.buildingId).toBe("alpha");
    expect(a.roomId).toBe("alpha-mkt");
    expect(a.activeCallId).toBeNull();
    expect(store.state().calls[0]?.status).toBe("closed");
  });

  it("rejects a second call while already on one", () => {
    const store = seededStore();
    store.agent.callToBuilding({ id: "call1", agentId: "a1", toBuildingId: "beta", toRoomId: "beta-dev" });
    expect(store.agent.callToBuilding({ id: "call2", agentId: "a1", toBuildingId: "beta", toRoomId: "beta-dev" }))
      .toEqual({ ok: false, reason: "already_on_call" });
  });

  it("rejects unknown agent, bad building/room and returnHome when not on call", () => {
    const store = seededStore();
    expect(store.agent.callToBuilding({ id: "c", agentId: "ghost", toBuildingId: "beta", toRoomId: "beta-dev" }))
      .toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.agent.callToBuilding({ id: "c", agentId: "a1", toBuildingId: "nope", toRoomId: "beta-dev" }))
      .toEqual({ ok: false, reason: "building_not_found" });
    expect(store.agent.callToBuilding({ id: "c", agentId: "a1", toBuildingId: "beta", toRoomId: "alpha-mkt" }))
      .toEqual({ ok: false, reason: "room_not_found_in_building" });
    expect(store.agent.returnHome({ agentId: "a1" })).toEqual({ ok: false, reason: "not_on_call" });
  });
});
