import { beforeEach, describe, expect, it } from "vitest";

import { CampusStore } from "../src/store/CampusStore";
import type { CampusEvent } from "../src/domain/types";
import {
  sampleCatalog,
  sampleClassifications,
  sampleDocuments,
  sampleLibrary,
  sampleProject,
  sampleWorkspaces,
} from "../src/samples";

function loadedStore(): CampusStore {
  const store = new CampusStore();
  store.loadProject({
    project: sampleProject,
    workspaces: sampleWorkspaces,
    catalog: sampleCatalog,
    library: sampleLibrary,
    classifications: sampleClassifications,
    documents: sampleDocuments,
  });
  return store;
}

describe("CampusStore", () => {
  let store: CampusStore;

  beforeEach(() => {
    store = loadedStore();
  });

  it("loads project + library into state", () => {
    const state = store.getState();
    expect(state.project?.id).toBe("proj-demo");
    expect(state.workspaces).toHaveLength(3);
    expect(state.catalog).toHaveLength(4);
    expect(state.library?.id).toBe("lib-main");
    expect(state.classifications.length).toBeGreaterThan(0);
  });

  it("instantiates a named agent into its home office", () => {
    const agent = store.instantiateAgent({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng",
      name: "Ada",
    });
    expect(agent.workspaceId).toBe("ws-dev");
    expect(store.namedAgents()).toHaveLength(1);
    expect(store.agentsInWorkspace("ws-dev").map((a) => a.id)).toContain(
      agent.id,
    );
  });

  it("notifies subscribers with the applied event", () => {
    const seen: CampusEvent[] = [];
    const unsub = store.subscribe((_state, event) => {
      if (event) seen.push(event);
    });
    store.instantiateAgent({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer",
      name: "Mia",
    });
    unsub();
    expect(seen.some((e) => e.type === "agent.instantiated")).toBe(true);
  });

  it("spawns a worker for an ic agent (worker.entered) and destroys it (worker.exited)", () => {
    const marketer = store.instantiateAgent({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer", // ic
      name: "Mia",
    });

    const spawn = store.spawnWorker({ actorId: marketer.id, label: "Helper" });
    expect(spawn.ok).toBe(true);
    expect(store.workers()).toHaveLength(1);
    expect(
      store.getEventLog().some((e) => e.type === "worker.entered"),
    ).toBe(true);

    if (!spawn.ok) throw new Error("expected spawn ok");
    const destroy = store.destroyWorker({
      actorId: marketer.id,
      workerId: spawn.worker.id,
    });
    expect(destroy.ok).toBe(true);
    expect(store.workers()).toHaveLength(0);
    expect(store.getEventLog().some((e) => e.type === "worker.exited")).toBe(
      true,
    );
  });

  it("rejects worker spawn for a non-ic agent (worker.spawn.rejected)", () => {
    const eng = store.instantiateAgent({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng", // senior
      name: "Ada",
    });
    const result = store.spawnWorker({ actorId: eng.id });
    expect(result.ok).toBe(false);
    expect(store.workers()).toHaveLength(0);
    expect(
      store.getEventLog().some((e) => e.type === "worker.spawn.rejected"),
    ).toBe(true);
  });

  it("applies agent.instantiated idempotently", () => {
    const agent = store.instantiateAgent({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer",
      name: "Mia",
    });
    store.dispatch({ type: "agent.instantiated", agent, peerIds: [] });
    expect(store.namedAgents()).toHaveLength(1);
  });

  it("updates harness params", () => {
    const agent = store.instantiateAgent({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer",
      name: "Mia",
    });
    store.updateHarness(agent.id, {
      model: "gpt-5",
      temperature: 0.9,
      effort: 0.1,
    });
    expect(store.getAgent(agent.id)?.harness.model).toBe("gpt-5");
  });
});
