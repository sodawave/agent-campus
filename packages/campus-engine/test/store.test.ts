import { describe, expect, it, vi } from "vitest";
import { CampusStore } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "mkt" });
  return store;
}

describe("CampusStore — facade dispatch (US1)", () => {
  it("accepted commands mutate state and grow the log in order", () => {
    const store = seeded();
    const s = store.state();
    expect(s.campus?.id).toBe("c1");
    expect(s.buildings.map((b) => b.id)).toEqual(["b1"]);
    expect(s.rooms.map((r) => r.id)).toEqual(["r1"]);
    expect(store.log().map((e) => e.type)).toEqual([
      "campus.loaded",
      "building.spawned",
      "room.spawned",
    ]);
  });

  it("agent.instantiate through the facade", () => {
    const store = seeded();
    const res = store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" });
    expect(res.ok).toBe(true);
    expect(store.state().agents.map((a) => a.id)).toEqual(["a1"]);
  });

  it("rejected command does not mutate state nor grow the log", () => {
    const store = seeded();
    const logLen = store.log().length;
    const stateRef = store.state();
    const res = store.room.spawn({ id: "rX", buildingId: "nope", key: "x" });
    expect(res).toEqual({ ok: false, reason: "building_not_found" });
    expect(store.state()).toBe(stateRef);
    expect(store.log()).toHaveLength(logLen);
  });

  it("building.spawn before a campus is loaded is rejected", () => {
    const store = new CampusStore();
    const res = store.building.spawn({ id: "b1", name: "Alpha" });
    expect(res).toEqual({ ok: false, reason: "campus_not_loaded" });
  });

  it("duplicate id is rejected", () => {
    const store = seeded();
    expect(store.building.spawn({ id: "b1", name: "dup" })).toEqual({ ok: false, reason: "duplicate_id" });
  });

  it("idempotent reload of same campus is a no-op (no extra log/notify)", () => {
    const store = seeded();
    const listener = vi.fn();
    store.subscribe(listener);
    const logLen = store.log().length;
    const res = store.campus.load({ id: "c1", name: "Demo Co" });
    expect(res.ok).toBe(true);
    expect(store.log()).toHaveLength(logLen);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("CampusStore — subscribe (US2)", () => {
  it("notifies on accepted command, not on rejection; unsubscribe stops it", () => {
    const store = new CampusStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.campus.load({ id: "c1", name: "Demo Co" }); // accepted -> 1
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(store.state());

    store.room.spawn({ id: "rX", buildingId: "nope", key: "x" }); // rejected -> no call
    expect(listener).toHaveBeenCalledTimes(1);

    store.building.spawn({ id: "b1", name: "Alpha" }); // accepted -> 2
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    store.room.spawn({ id: "r1", buildingId: "b1", key: "mkt" }); // accepted but unsubscribed
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
