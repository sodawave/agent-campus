import { beforeEach, describe, expect, it } from "vitest";

import { CampusStore } from "../src/store/CampusStore";
import {
  sampleCampus,
  sampleCatalog,
  sampleClassifications,
  sampleDocuments,
  sampleLibrary,
  sampleProject,
  sampleWorkspaces,
} from "../src/samples";

function loadedStore(): CampusStore {
  const store = new CampusStore();
  store.campus.load({
    campus: sampleCampus,
    project: sampleProject,
    workspaces: sampleWorkspaces,
    catalog: sampleCatalog,
    library: sampleLibrary,
    classifications: sampleClassifications,
    documents: sampleDocuments,
  });
  return store;
}

describe("Spec Kit (SDD) per building", () => {
  let store: CampusStore;

  beforeEach(() => {
    store = loadedStore();
  });

  it("enables Spec Kit on a building with sensible defaults", () => {
    expect(store.specKitOf(sampleProject.id)).toBeUndefined();
    store.building.specKit.enable(sampleProject.id);
    const sk = store.specKitOf(sampleProject.id);
    expect(sk?.enabled).toBe(true);
    expect(sk?.phase).toBe("constitution");
    expect(sk?.convergence).toBe("diverged");
  });

  it("enables with overrides (extensions)", () => {
    store.building.specKit.enable(sampleProject.id, { extensions: ["bug"] });
    expect(store.specKitOf(sampleProject.id)?.extensions).toEqual(["bug"]);
  });

  it("advances phases constitution → … → converge and marks convergence", () => {
    store.building.specKit.enable(sampleProject.id);
    const seen: string[] = ["constitution"];
    for (let i = 0; i < 6; i++) {
      store.building.specKit.advancePhase(sampleProject.id);
      seen.push(store.specKitOf(sampleProject.id)!.phase);
    }
    expect(seen).toEqual([
      "constitution",
      "specify",
      "plan",
      "tasks",
      "implement",
      "converge",
      "converge", // idempotent at the end
    ]);
    expect(store.specKitOf(sampleProject.id)?.convergence).toBe("converged");
  });

  it("phase.changed on a building without prior specKit initializes it", () => {
    store.building.specKit.setPhase(sampleProject.id, "plan");
    const sk = store.specKitOf(sampleProject.id);
    expect(sk?.phase).toBe("plan");
    expect(sk?.enabled).toBe(true);
  });

  it("adds artifacts scoped to the building", () => {
    store.building.specKit.enable(sampleProject.id);
    const spec = store.building.specKit.addArtifact({
      buildingId: sampleProject.id,
      kind: "spec",
      title: "Campus MVP spec",
      uri: "specs/mvp/spec.md",
    });
    expect(spec.status).toBe("draft");
    expect(store.specArtifactsOf(sampleProject.id).map((a) => a.id)).toContain(
      spec.id,
    );
    // Not leaking to another building.
    const beta = store.building.spawn({ name: "Beta Labs" });
    expect(store.specArtifactsOf(beta.id)).toHaveLength(0);
  });

  it("keeps Spec Kit per building (independent bindings)", () => {
    const beta = store.building.spawn({ name: "Beta Labs" });
    store.building.specKit.enable(sampleProject.id);
    store.building.specKit.enable(beta.id, { extensions: ["assess"] });
    store.building.specKit.advancePhase(beta.id); // beta → specify

    expect(store.specKitOf(sampleProject.id)?.phase).toBe("constitution");
    expect(store.specKitOf(beta.id)?.phase).toBe("specify");
    expect(store.specKitOf(beta.id)?.extensions).toEqual(["assess"]);
  });
});
