import { beforeEach, describe, expect, it } from "vitest";

import { CampusCore } from "../src/core/CampusCore";
import { CampusStore } from "../src/store/CampusStore";
import type { CampusCommand } from "../src/domain/types";
import {
  sampleCampus,
  sampleCatalog,
  sampleClassifications,
  sampleDocuments,
  sampleLibrary,
  sampleProject,
  sampleWorkspaces,
} from "../src/samples";

function loadedCore(): CampusCore {
  const core = new CampusCore();
  core.load({
    campus: sampleCampus,
    project: sampleProject,
    workspaces: sampleWorkspaces,
    catalog: sampleCatalog,
    library: sampleLibrary,
    classifications: sampleClassifications,
    documents: sampleDocuments,
  });
  return core;
}

const spawnMarketer: CampusCommand = {
  type: "agent.spawn",
  request: { projectId: "proj-demo", archetypeId: "arch-marketer", name: "Mia" },
};
const spawnEngineer: CampusCommand = {
  type: "agent.spawn",
  request: { projectId: "proj-demo", archetypeId: "arch-systems-eng", name: "Ada" },
};

describe("CampusCore — Command/Event contract", () => {
  let core: CampusCore;

  beforeEach(() => {
    core = loadedCore();
  });

  it("T020: a valid Command produces sequenced facts and changes state", () => {
    const before = core.state().agents.length;
    const result = core.execute(spawnMarketer);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.events.some((e) => e.type === "agent.instantiated")).toBe(true);
    expect(core.state().agents.length).toBe(before + 1);
  });

  it("T020b: a valid worker.spawn by an ic agent is accepted", () => {
    core.execute(spawnMarketer); // ic
    const mia = core.state().agents.find((a) => a.skill.key === "marketing")!;
    const result = core.execute({ type: "worker.spawn", actorId: mia.id });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.events.some((e) => e.type === "worker.entered")).toBe(true);
  });

  it("T021: an invalid Command is rejected and does NOT change state", () => {
    core.execute(spawnEngineer); // senior (not ic)
    const eng = core.state().agents.find(
      (a) => a.skill.key === "systems-engineering",
    )!;
    const before = core.state().agents.length;
    const result = core.execute({ type: "worker.spawn", actorId: eng.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rank_not_allowed");
    expect(core.state().agents.length).toBe(before); // no worker added
    expect(
      core.eventLog().some((e) => e.type === "worker.spawn.rejected"),
    ).toBe(true);
  });

  it("T021b: an unknown archetype fails gracefully without throwing", () => {
    const result = core.execute({
      type: "agent.spawn",
      request: { projectId: "proj-demo", archetypeId: "nope", name: "X" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("unknown_archetype");
  });

  it("T022: CampusCommand round-trips through JSON without loss", () => {
    const cmd: CampusCommand = {
      type: "worker.spawn",
      actorId: "agent-1",
      label: "Helper",
    };
    expect(JSON.parse(JSON.stringify(cmd))).toEqual(cmd);
    expect(JSON.parse(JSON.stringify(spawnMarketer))).toEqual(spawnMarketer);
  });

  it("T023: replaying the event log on a clean store reaches identical state", () => {
    core.execute(spawnMarketer);
    const mia = core.state().agents.find((a) => a.skill.key === "marketing")!;
    core.execute({ type: "worker.spawn", actorId: mia.id });

    // Consumer B rebuilds state purely from the sequenced event log.
    const consumerB = new CampusStore();
    for (const event of core.eventLog()) consumerB.dispatch(event);

    expect(consumerB.getState()).toEqual(core.state());
  });
});
