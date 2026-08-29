import { describe, expect, it } from "vitest";

import {
  sampleBuildingLayout,
  sampleCatalog,
  sampleClassifications,
  sampleProject,
  sampleWorkspaces,
} from "../src/samples";
import { classificationsForSkill } from "../src/domain/library";

describe("sample dataset integrity", () => {
  it("project references its workspaces", () => {
    expect(sampleProject.workspaceIds).toEqual(
      sampleWorkspaces.map((w) => w.id),
    );
    expect(sampleWorkspaces.every((w) => w.projectId === sampleProject.id)).toBe(
      true,
    );
  });

  it("every catalog archetype declares a rank that exists in the project ladder", () => {
    const rankKeys = new Set(sampleProject.ranks.map((r) => r.key));
    for (const a of sampleCatalog) {
      expect(rankKeys.has(a.defaultRankKey)).toBe(true);
    }
  });

  it("building layout rooms map to known workspace keys (or are structural)", () => {
    const wsKeys = new Set(sampleWorkspaces.map((w) => w.key));
    const structural = new Set([null, undefined, "_infra"]);
    for (const room of sampleBuildingLayout.rooms) {
      if (structural.has(room.workspaceKey as string | null | undefined)) continue;
      expect(wsKeys.has(room.workspaceKey as string)).toBe(true);
    }
  });

  it("classifications bind to real oficios used by the catalog", () => {
    const skillKeys = new Set(sampleCatalog.map((a) => a.skill.key));
    const bound = classificationsForSkill(sampleClassifications, "systems-engineering");
    expect(bound.length).toBeGreaterThan(0);
    for (const c of sampleClassifications) {
      for (const k of c.skillKeys) {
        // every bound skill key should correspond to at least one archetype
        // (demo dataset invariant)
        expect(skillKeys.has(k)).toBe(true);
      }
    }
  });
});
