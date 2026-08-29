import { describe, expect, it } from "vitest";
import { CampusStore, EMPTY_STATE, buildCampus, buildBuilding, reduceAll } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Casa" }); // also creates boss room "b1-boss"
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  return store;
}

describe("room.updateContext", () => {
  it("sets the department context", () => {
    const store = seeded();
    expect(store.room.updateContext({ roomId: "r1", context: "Normas de ingeniería" }).ok).toBe(true);
    expect(store.state().rooms.find((r) => r.id === "r1")?.context).toBe("Normas de ingeniería");
  });
  it("rejects an unknown room", () => {
    const store = seeded();
    expect(store.room.updateContext({ roomId: "nope", context: "x" })).toEqual({ ok: false, reason: "room_not_found" });
  });
});

describe("room.spawn with role", () => {
  it("creates a room with the given role", () => {
    const store = seeded();
    expect(store.room.spawn({ id: "r2", buildingId: "b1", key: "infra", role: "utility" }).ok).toBe(true);
    expect(store.state().rooms.find((r) => r.id === "r2")?.role).toBe("utility");
  });
  it("omits role when not provided", () => {
    const store = seeded();
    expect(store.state().rooms.find((r) => r.id === "r1")?.role).toBeUndefined();
  });
  it("the boss office created by building.spawn has role boss", () => {
    const store = seeded();
    expect(store.state().rooms.find((r) => r.id === "b1-boss")?.role).toBe("boss");
  });
});

describe("reduce tolerance", () => {
  it("room.context.updated for an unknown room is a no-op", () => {
    const base = reduceAll(EMPTY_STATE, [
      { type: "campus.loaded", campus: buildCampus({ id: "c1", name: "C" }) },
      { type: "building.spawned", building: buildBuilding({ id: "b1", campusId: "c1", name: "B" }) },
    ]);
    expect(reduceAll(base, [{ type: "room.context.updated", roomId: "ghost", context: "x" }])).toBe(base);
  });
});
