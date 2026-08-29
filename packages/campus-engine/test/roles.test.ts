import { describe, expect, it } from "vitest";
import {
  CampusStore,
  EMPTY_STATE as EMPTY,
  reduceAll,
  buildCampus,
  buildBuilding,
  buildRoom,
  buildAgent,
} from "../src/index";

function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "mkt" });
  store.room.spawn({ id: "r2", buildingId: "b1", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1", rankKey: "lead" });
  store.agent.instantiate({ id: "a2", name: "Ivan", buildingId: "b1", roomId: "r2", rankKey: "ic" });
  return store;
}

describe("layer 6 — agent role fields via builder", () => {
  it("buildAgent omits role fields when not provided (non-breaking)", () => {
    expect(buildAgent({ id: "a", name: "X", buildingId: "b", roomId: "r" })).toEqual({
      id: "a", name: "X", kind: "named", buildingId: "b", roomId: "r",
    });
  });
  it("buildAgent includes role fields when provided", () => {
    expect(buildAgent({ id: "a", name: "X", buildingId: "b", roomId: "r", rankKey: "ic", skillKey: "eng", supervisorId: null }))
      .toEqual({ id: "a", name: "X", kind: "named", buildingId: "b", roomId: "r", rankKey: "ic", skillKey: "eng", supervisorId: null });
  });
});

describe("agent.assignSupervisor", () => {
  it("assigns a supervisor and reflects it in state", () => {
    const store = seededStore();
    const res = store.agent.assignSupervisor({ agentId: "a2", supervisorId: "a1" });
    expect(res.ok).toBe(true);
    expect(store.state().agents.find((a) => a.id === "a2")?.supervisorId).toBe("a1");
  });
  it("can clear a supervisor (null)", () => {
    const store = seededStore();
    store.agent.assignSupervisor({ agentId: "a2", supervisorId: "a1" });
    store.agent.assignSupervisor({ agentId: "a2", supervisorId: null });
    expect(store.state().agents.find((a) => a.id === "a2")?.supervisorId).toBeNull();
  });
  it("rejects unknown agent, unknown supervisor and self-supervision", () => {
    const store = seededStore();
    expect(store.agent.assignSupervisor({ agentId: "nope", supervisorId: "a1" })).toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.agent.assignSupervisor({ agentId: "a2", supervisorId: "nope" })).toEqual({ ok: false, reason: "supervisor_not_found" });
    expect(store.agent.assignSupervisor({ agentId: "a2", supervisorId: "a2" })).toEqual({ ok: false, reason: "self_supervision" });
  });
});

describe("room.assignHead", () => {
  it("assigns a head that belongs to the room", () => {
    const store = seededStore();
    const res = store.room.assignHead({ roomId: "r1", agentId: "a1" });
    expect(res.ok).toBe(true);
    expect(store.state().rooms.find((r) => r.id === "r1")?.headAgentId).toBe("a1");
  });
  it("rejects unknown room, unknown agent, and agent not in room", () => {
    const store = seededStore();
    expect(store.room.assignHead({ roomId: "nope", agentId: "a1" })).toEqual({ ok: false, reason: "room_not_found" });
    expect(store.room.assignHead({ roomId: "r1", agentId: "nope" })).toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.room.assignHead({ roomId: "r1", agentId: "a2" })).toEqual({ ok: false, reason: "agent_not_in_room" });
  });
});

describe("reduce — role events are tolerant/idempotent", () => {
  it("ignores supervisor/head events for unknown targets", () => {
    const base = reduceAll(EMPTY, [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo" }) },
      { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "A" }) },
      { type: "room.spawned", room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt" }) },
    ]);
    expect(reduceAll(base, [{ type: "agent.supervisor.assigned", agentId: "ghost", supervisorId: "x" }])).toBe(base);
    expect(reduceAll(base, [{ type: "room.head.assigned", roomId: "ghost", agentId: "x" }])).toBe(base);
  });
});
