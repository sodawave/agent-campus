import { describe, expect, it } from "vitest";
import {
  EMPTY_STATE,
  buildBuilding,
  buildCampus,
  buildRoom,
  reduce,
  reduceAll,
  type CampusEvent,
} from "../src/index";

/** A small campus log: 1 campus, 2 buildings, 3 rooms. */
function sampleLog(): CampusEvent[] {
  return [
    { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) },
    { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) },
    { type: "building.spawned", building: buildBuilding({ id: "b2", campusId: "c1", name: "Beta" }) },
    { type: "room.spawned", room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt" }) },
    { type: "room.spawned", room: buildRoom({ id: "r2", buildingId: "b1", key: "dev" }) },
    { type: "room.spawned", room: buildRoom({ id: "r3", buildingId: "b2", key: "ops" }) },
  ];
}

describe("reduce (US1 — rebuild state from events)", () => {
  it("AS1: campus.loaded sets the campus with no buildings", () => {
    const s = reduce(EMPTY_STATE, {
      type: "campus.loaded",
      campus: buildCampus({ id: "c1", name: "Demo Co" }),
    });
    expect(s.campus).toEqual({ id: "c1", name: "Demo Co", buildingIds: [] });
    expect(s.buildings).toEqual([]);
  });

  it("AS2/AS3: buildings and rooms are associated correctly (N=2, M=3)", () => {
    const s = reduceAll(EMPTY_STATE, sampleLog());
    expect(s.campus?.id).toBe("c1");
    expect(s.buildings.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(s.rooms.filter((r) => r.buildingId === "b1").map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(s.rooms.filter((r) => r.buildingId === "b2").map((r) => r.id)).toEqual(["r3"]);
  });

  it("SC-001: exactly N buildings and M rooms", () => {
    const s = reduceAll(EMPTY_STATE, sampleLog());
    expect(s.buildings).toHaveLength(2);
    expect(s.rooms).toHaveLength(3);
  });

  it("AS4 / SC-002: idempotent — applying the log twice equals once", () => {
    const once = reduceAll(EMPTY_STATE, sampleLog());
    const twice = reduceAll(once, sampleLog());
    expect(twice).toEqual(once);
  });

  it("AS5: deterministic — same log reduces to structurally equal states", () => {
    const a = reduceAll(EMPTY_STATE, sampleLog());
    const b = reduceAll(EMPTY_STATE, sampleLog());
    expect(a).toEqual(b);
  });

  it("reapplying campus.loaded of the same campus is a no-op", () => {
    const s1 = reduce(EMPTY_STATE, {
      type: "campus.loaded",
      campus: buildCampus({ id: "c1", name: "Demo Co" }),
    });
    const s2 = reduce(s1, {
      type: "campus.loaded",
      campus: buildCampus({ id: "c1", name: "Demo Co" }),
    });
    expect(s2).toBe(s1);
  });
});

describe("reduce (FR-010 — tolerant to inconsistent/unknown events)", () => {
  it("building.spawned with unknown campusId is ignored", () => {
    const base = reduce(EMPTY_STATE, {
      type: "campus.loaded",
      campus: buildCampus({ id: "c1", name: "Demo Co" }),
    });
    const s = reduce(base, {
      type: "building.spawned",
      building: buildBuilding({ id: "bx", campusId: "nope", name: "Ghost" }),
    });
    expect(s).toBe(base);
  });

  it("building.spawned without a loaded campus is ignored", () => {
    const s = reduce(EMPTY_STATE, {
      type: "building.spawned",
      building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }),
    });
    expect(s).toBe(EMPTY_STATE);
  });

  it("room.spawned with unknown buildingId is ignored", () => {
    const base = reduceAll(EMPTY_STATE, [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) },
      { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) },
    ]);
    const s = reduce(base, {
      type: "room.spawned",
      room: buildRoom({ id: "rx", buildingId: "nope", key: "mkt" }),
    });
    expect(s).toBe(base);
  });

  it("duplicate building/room ids are ignored", () => {
    const log = sampleLog();
    const base = reduceAll(EMPTY_STATE, log);
    const dupBuilding = reduce(base, {
      type: "building.spawned",
      building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha again" }),
    });
    expect(dupBuilding).toBe(base);
    const dupRoom = reduce(base, {
      type: "room.spawned",
      room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt again" }),
    });
    expect(dupRoom).toBe(base);
  });

  it("unknown event type leaves state unchanged", () => {
    const base = reduceAll(EMPTY_STATE, sampleLog());
    const s = reduce(base, { type: "nope.happened" } as unknown as CampusEvent);
    expect(s).toBe(base);
  });
});

describe("reduce — immutability", () => {
  it("does not mutate the input state or arrays", () => {
    const base = reduceAll(EMPTY_STATE, [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "Demo Co" }) },
    ]);
    const buildingsRef = base.buildings;
    const next = reduce(base, {
      type: "building.spawned",
      building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }),
    });
    expect(base.buildings).toBe(buildingsRef);
    expect(base.buildings).toHaveLength(0);
    expect(next.buildings).toHaveLength(1);
    expect(next).not.toBe(base);
  });
});
