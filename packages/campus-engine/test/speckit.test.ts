import { describe, expect, it } from "vitest";
import { CampusStore, nextSpecKitPhase, SPECKIT_PHASES } from "../src/index";

function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  return store;
}

describe("nextSpecKitPhase (pure)", () => {
  it("advances through the ordered phases and stops at converge", () => {
    expect(nextSpecKitPhase("constitution")).toBe("specify");
    expect(nextSpecKitPhase("tasks")).toBe("implement");
    expect(nextSpecKitPhase("converge")).toBeNull();
    expect(SPECKIT_PHASES[0]).toBe("constitution");
  });
});

describe("building Spec Kit", () => {
  it("enable starts at constitution", () => {
    const store = seededStore();
    expect(store.specKit.enable({ buildingId: "b1" }).ok).toBe(true);
    expect(store.state().specKits[0]).toEqual({ buildingId: "b1", phase: "constitution" });
  });

  it("advancePhase walks the SDD phases to converge, then rejects", () => {
    const store = seededStore();
    store.specKit.enable({ buildingId: "b1" });
    const seen = ["constitution"];
    for (let i = 0; i < 5; i++) {
      expect(store.specKit.advancePhase({ buildingId: "b1" }).ok).toBe(true);
      seen.push(store.state().specKits[0]!.phase);
    }
    expect(seen).toEqual([...SPECKIT_PHASES]);
    expect(store.specKit.advancePhase({ buildingId: "b1" })).toEqual({ ok: false, reason: "no_next_phase" });
  });

  it("addArtifact requires enabled spec kit and unique id", () => {
    const store = seededStore();
    expect(store.specKit.addArtifact({ id: "a1", buildingId: "b1", kind: "spec", title: "Spec" }))
      .toEqual({ ok: false, reason: "speckit_not_enabled" });
    store.specKit.enable({ buildingId: "b1" });
    expect(store.specKit.addArtifact({ id: "a1", buildingId: "b1", kind: "spec", title: "Spec" }).ok).toBe(true);
    expect(store.state().specArtifacts).toHaveLength(1);
    expect(store.specKit.addArtifact({ id: "a1", buildingId: "b1", kind: "plan", title: "Plan" }))
      .toEqual({ ok: false, reason: "duplicate_id" });
  });

  it("rejects enable on unknown building and double enable", () => {
    const store = seededStore();
    expect(store.specKit.enable({ buildingId: "nope" })).toEqual({ ok: false, reason: "building_not_found" });
    store.specKit.enable({ buildingId: "b1" });
    expect(store.specKit.enable({ buildingId: "b1" })).toEqual({ ok: false, reason: "speckit_already_enabled" });
  });
});
