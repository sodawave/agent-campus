import { describe, expect, it } from "vitest";
import { buildBuilding, buildCampus, buildRoom } from "../src/index";

describe("builders (US2 — pure)", () => {
  it("buildCampus returns a campus with empty buildingIds by default", () => {
    const campus = buildCampus({ id: "c1", name: "Demo Co" });
    expect(campus).toEqual({ id: "c1", name: "Demo Co", buildingIds: [] });
  });

  it("buildCampus copies buildingIds (no shared reference)", () => {
    const ids = ["b1"];
    const campus = buildCampus({ id: "c1", name: "Demo Co", buildingIds: ids });
    expect(campus.buildingIds).toEqual(["b1"]);
    expect(campus.buildingIds).not.toBe(ids);
  });

  it("buildBuilding returns minimal building fields", () => {
    expect(buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" })).toEqual({
      id: "b1",
      campusId: "c1",
      name: "Alpha",
    });
  });

  it("buildRoom returns minimal room fields", () => {
    expect(buildRoom({ id: "r1", buildingId: "b1", key: "mkt" })).toEqual({
      id: "r1",
      buildingId: "b1",
      key: "mkt",
    });
  });

  it("same input -> structurally equal output (deterministic)", () => {
    const a = buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" });
    const b = buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" });
    expect(a).toEqual(b);
  });
});
