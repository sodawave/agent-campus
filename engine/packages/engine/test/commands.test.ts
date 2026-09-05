import { describe, expect, it } from "vitest";
import {
  EMPTY_STATE,
  buildBuilding,
  buildCampus,
  buildRoom,
  execute,
  reduceAll,
  type CampusCommand,
} from "../src/index";

/** Base state: campus c1 with building b1 and room r1. */
function base() {
  return reduceAll(EMPTY_STATE, [
    { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) },
    { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) },
    { type: "room.spawned", room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt" }) },
  ]);
}

describe("execute — acceptance (US1)", () => {
  it("campus.load on empty state accepts campus.loaded", () => {
    const res = execute(EMPTY_STATE, {
      type: "campus.load",
      campus: buildCampus({ id: "c1", name: "Demo Co" }),
    });
    expect(res).toEqual({ ok: true, event: { type: "campus.loaded", campus: { id: "c1", name: "Demo Co", buildingIds: [] } } });
  });

  it("building.spawn on loaded campus accepts building.spawned", () => {
    const s = execute(EMPTY_STATE, { type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });
    expect(s.ok).toBe(true);
    const withCampus = reduceAll(EMPTY_STATE, [{ type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) }]);
    const res = execute(withCampus, {
      type: "building.spawn",
      building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }),
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.event.type).toBe("building.spawned");
  });

  it("room.spawn and agent.instantiate accept when parents exist", () => {
    const b = base();
    const room = execute(b, { type: "room.spawn", room: buildRoom({ id: "r2", buildingId: "b1", key: "dev" }) });
    expect(room.ok).toBe(true);
    const agent = execute(b, {
      type: "agent.instantiate",
      agent: { id: "a1", name: "Mia", kind: "named", buildingId: "b1", roomId: "r1" },
    });
    expect(agent.ok).toBe(true);
    if (agent.ok) expect(agent.event.type).toBe("agent.instantiated");
  });

  it("campus.load of the same id is accepted (idempotent no-op event)", () => {
    const withCampus = reduceAll(EMPTY_STATE, [{ type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) }]);
    const res = execute(withCampus, { type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });
    expect(res.ok).toBe(true);
  });
});

describe("execute — rejections (each RejectionReason, SC-002)", () => {
  it("campus_already_loaded", () => {
    const withCampus = reduceAll(EMPTY_STATE, [{ type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) }]);
    const res = execute(withCampus, { type: "campus.load", campus: buildCampus({ id: "c2", name: "Other" }) });
    expect(res).toEqual({ ok: false, reason: "campus_already_loaded" });
  });

  it("campus_not_loaded", () => {
    const res = execute(EMPTY_STATE, {
      type: "building.spawn",
      building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }),
    });
    expect(res).toEqual({ ok: false, reason: "campus_not_loaded" });
  });

  it("campus_mismatch", () => {
    const withCampus = reduceAll(EMPTY_STATE, [{ type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) }]);
    const res = execute(withCampus, {
      type: "building.spawn",
      building: buildBuilding({ id: "b1", campusId: "cX", name: "Alpha" }),
    });
    expect(res).toEqual({ ok: false, reason: "campus_mismatch" });
  });

  it("building_not_found (room)", () => {
    const withCampus = reduceAll(EMPTY_STATE, [{ type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) }]);
    const res = execute(withCampus, { type: "room.spawn", room: buildRoom({ id: "r1", buildingId: "nope", key: "mkt" }) });
    expect(res).toEqual({ ok: false, reason: "building_not_found" });
  });

  it("room_not_found_in_building (agent)", () => {
    const b = base();
    const res = execute(b, {
      type: "agent.instantiate",
      agent: { id: "a1", name: "Mia", kind: "named", buildingId: "b1", roomId: "nope" },
    });
    expect(res).toEqual({ ok: false, reason: "room_not_found_in_building" });
  });

  it("duplicate_id (building/room/agent)", () => {
    const b = base();
    expect(execute(b, { type: "building.spawn", building: buildBuilding({ id: "b1", campusId: "c1", name: "dup" }) }))
      .toEqual({ ok: false, reason: "duplicate_id" });
    expect(execute(b, { type: "room.spawn", room: buildRoom({ id: "r1", buildingId: "b1", key: "dup" }) }))
      .toEqual({ ok: false, reason: "duplicate_id" });
    const withAgent = reduceAll(b, [{ type: "agent.instantiated", agent: { id: "a1", name: "Mia", kind: "named", buildingId: "b1", roomId: "r1" } }]);
    expect(execute(withAgent, { type: "agent.instantiate", agent: { id: "a1", name: "dup", kind: "named", buildingId: "b1", roomId: "r1" } }))
      .toEqual({ ok: false, reason: "duplicate_id" });
  });
});

describe("execute — purity", () => {
  it("does not mutate the input state", () => {
    const b = base();
    const before = JSON.stringify(b);
    execute(b, { type: "room.spawn", room: buildRoom({ id: "r9", buildingId: "b1", key: "x" }) });
    expect(JSON.stringify(b)).toBe(before);
  });
});
