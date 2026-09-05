import { describe, expect, it } from "vitest";
import {
  EMPTY_STATE,
  buildAgent,
  buildBuilding,
  buildCampus,
  buildRoom,
  reduce,
  reduceAll,
  type CampusEvent,
} from "../src/index";

/** Base: campus c1 with buildings b1,b2 and rooms r1(b1), r2(b2). */
function base() {
  return reduceAll(EMPTY_STATE, [
    { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) },
    { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) },
    { type: "building.spawned", building: buildBuilding({ id: "b2", campusId: "c1", name: "Beta" }) },
    { type: "room.spawned", room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt" }) },
    { type: "room.spawned", room: buildRoom({ id: "r2", buildingId: "b2", key: "ops" }) },
  ]);
}

describe("reduce — agent.instantiated (US1)", () => {
  it("AS1: agent is projected into its room/building", () => {
    const s = reduce(base(), {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" }),
    });
    expect(s.agents).toEqual([
      { id: "a1", name: "Mia", kind: "named", buildingId: "b1", roomId: "r1" },
    ]);
  });

  it("SC-001: K agents associated to their rooms", () => {
    const s = reduceAll(base(), [
      { type: "agent.instantiated", agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" }) },
      { type: "agent.instantiated", agent: buildAgent({ id: "a2", name: "Ivan", buildingId: "b2", roomId: "r2" }) },
    ]);
    expect(s.agents).toHaveLength(2);
    expect(s.agents.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("AS2: reapplying the same agent event is a no-op (idempotent by id)", () => {
    const evt: CampusEvent = {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" }),
    };
    const s1 = reduce(base(), evt);
    const s2 = reduce(s1, evt);
    expect(s2).toBe(s1);
  });

  it("AS3: deterministic + idempotent over a full log", () => {
    const log: CampusEvent[] = [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) },
      { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) },
      { type: "room.spawned", room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt" }) },
      { type: "agent.instantiated", agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" }) },
    ];
    const once = reduceAll(EMPTY_STATE, log);
    const twice = reduceAll(once, log);
    expect(twice).toEqual(once);
  });
});

describe("reduce — agent.instantiated (tolerant, SC-003)", () => {
  it("unknown buildingId is ignored", () => {
    const b = base();
    const s = reduce(b, {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "nope", roomId: "r1" }),
    });
    expect(s).toBe(b);
  });

  it("unknown roomId is ignored", () => {
    const b = base();
    const s = reduce(b, {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "nope" }),
    });
    expect(s).toBe(b);
  });

  it("room belonging to another building is ignored (cross check)", () => {
    const b = base();
    const s = reduce(b, {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r2" }),
    });
    expect(s).toBe(b);
  });

  it("duplicate agent id is ignored", () => {
    const withAgent = reduce(base(), {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" }),
    });
    const dup = reduce(withAgent, {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia clone", buildingId: "b1", roomId: "r1" }),
    });
    expect(dup).toBe(withAgent);
  });
});

describe("reduce — agent.instantiated immutability", () => {
  it("does not mutate the input state agents array", () => {
    const b = base();
    const agentsRef = b.agents;
    const next = reduce(b, {
      type: "agent.instantiated",
      agent: buildAgent({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" }),
    });
    expect(b.agents).toBe(agentsRef);
    expect(b.agents).toHaveLength(0);
    expect(next.agents).toHaveLength(1);
    expect(next).not.toBe(b);
  });
});
