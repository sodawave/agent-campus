import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Empresa A" }); // + leader room "b1-leader" + leader agent
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.room.spawn({ id: "r2", buildingId: "b1", key: "ops" });
  store.agent.instantiate({ id: "a1", name: "Ada", buildingId: "b1", roomId: "r1" });
  return store;
}

describe("room.delete", () => {
  it("deletes an empty non-leader room", () => {
    const store = seeded();
    expect(store.room.delete({ roomId: "r2" }).ok).toBe(true);
    expect(store.state().rooms.some((r) => r.id === "r2")).toBe(false);
  });

  it("refuses to delete the leader office (non-deletable invariant)", () => {
    const store = seeded();
    expect(store.room.delete({ roomId: "b1-leader" })).toEqual({ ok: false, reason: "leader_room_not_deletable" });
    expect(store.state().rooms.some((r) => r.id === "b1-leader")).toBe(true);
  });

  it("refuses to delete a room that still has agents", () => {
    const store = seeded();
    expect(store.room.delete({ roomId: "r1" })).toEqual({ ok: false, reason: "room_not_empty" });
    expect(store.state().rooms.some((r) => r.id === "r1")).toBe(true);
  });

  it("rejects an unknown room", () => {
    const store = seeded();
    expect(store.room.delete({ roomId: "nope" })).toEqual({ ok: false, reason: "room_not_found" });
  });
});
