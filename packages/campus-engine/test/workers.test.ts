import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

/** Seed a campus with an ic agent (spawner) and a lead agent (not allowed). */
function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "mkt" });
  store.agent.instantiate({ id: "ic1", name: "Icaro", buildingId: "b1", roomId: "r1", rankKey: "ic" });
  store.agent.instantiate({ id: "lead1", name: "Lena", buildingId: "b1", roomId: "r1", rankKey: "lead" });
  return store;
}

describe("worker.spawn (Constitución VI — only ic)", () => {
  it("an ic agent spawns an anonymous worker (worker.entered)", () => {
    const store = seededStore();
    const res = store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "b1", roomId: "r1" });
    expect(res.ok).toBe(true);
    const workers = store.state().workers;
    expect(workers).toHaveLength(1);
    expect(workers[0]).toMatchObject({ id: "w1", kind: "anonymous_worker", spawnedById: "ic1", rankKey: "ic" });
  });

  it("a non-ic agent cannot spawn workers", () => {
    const store = seededStore();
    expect(store.worker.spawn({ id: "w1", actorId: "lead1", buildingId: "b1", roomId: "r1" }))
      .toEqual({ ok: false, reason: "rank_not_allowed" });
    expect(store.state().workers).toHaveLength(0);
  });

  it("rejects unknown actor, bad building/room and duplicate id", () => {
    const store = seededStore();
    expect(store.worker.spawn({ id: "w1", actorId: "ghost", buildingId: "b1", roomId: "r1" }))
      .toEqual({ ok: false, reason: "actor_not_found" });
    expect(store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "nope", roomId: "r1" }))
      .toEqual({ ok: false, reason: "building_not_found" });
    expect(store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "b1", roomId: "nope" }))
      .toEqual({ ok: false, reason: "room_not_found_in_building" });
    store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "b1", roomId: "r1" });
    expect(store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "b1", roomId: "r1" }))
      .toEqual({ ok: false, reason: "duplicate_id" });
  });
});

describe("worker.despawn (only the spawner)", () => {
  it("the spawner can despawn its worker (worker.exited)", () => {
    const store = seededStore();
    store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "b1", roomId: "r1" });
    const res = store.worker.despawn({ actorId: "ic1", workerId: "w1" });
    expect(res.ok).toBe(true);
    expect(store.state().workers).toHaveLength(0);
  });

  it("rejects unknown worker and non-spawner", () => {
    const store = seededStore();
    store.agent.instantiate({ id: "ic2", name: "Otto", buildingId: "b1", roomId: "r1", rankKey: "ic" });
    store.worker.spawn({ id: "w1", actorId: "ic1", buildingId: "b1", roomId: "r1" });
    expect(store.worker.despawn({ actorId: "ic1", workerId: "ghost" }))
      .toEqual({ ok: false, reason: "worker_not_found" });
    expect(store.worker.despawn({ actorId: "ic2", workerId: "w1" }))
      .toEqual({ ok: false, reason: "not_worker_spawner" });
    expect(store.state().workers).toHaveLength(1);
  });
});
