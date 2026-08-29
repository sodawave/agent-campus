import { beforeEach, describe, expect, it } from "vitest";

import { CampusStore } from "../src/store/CampusStore";
import type { CampusEvent } from "../src/domain/types";
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

describe("CampusStore", () => {
  let store: CampusStore;

  beforeEach(() => {
    store = loadedStore();
  });

  it("loads campus + first building + library into state", () => {
    const state = store.getState();
    expect(state.campus?.id).toBe("campus-demo");
    expect(state.buildings).toHaveLength(1);
    expect(store.firstBuilding()?.id).toBe("proj-demo");
    expect(state.workspaces).toHaveLength(3);
    expect(state.catalog).toHaveLength(4);
    expect(state.library?.id).toBe("lib-main");
    expect(state.classifications.length).toBeGreaterThan(0);
  });

  it("instantiates a named agent into its home office", () => {
    const agent = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng",
      name: "Ada",
    });
    expect(agent.workspaceId).toBe("ws-dev");
    expect(store.namedAgents()).toHaveLength(1);
    expect(store.agentsInWorkspace("ws-dev").map((a) => a.id)).toContain(
      agent.id,
    );
    expect(store.agentsInBuilding(sampleProject.id)).toHaveLength(1);
  });

  it("notifies subscribers with the applied event", () => {
    const seen: CampusEvent[] = [];
    const unsub = store.subscribe((_state, event) => {
      if (event) seen.push(event);
    });
    store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer",
      name: "Mia",
    });
    unsub();
    expect(seen.some((e) => e.type === "agent.instantiated")).toBe(true);
  });

  it("spawns a worker for an ic agent (worker.entered) and destroys it (worker.exited)", () => {
    const marketer = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer", // ic
      name: "Mia",
    });

    const spawn = store.worker.spawn({ actorId: marketer.id, label: "Helper" });
    expect(spawn.ok).toBe(true);
    expect(store.workers()).toHaveLength(1);
    expect(store.getEventLog().some((e) => e.type === "worker.entered")).toBe(
      true,
    );

    if (!spawn.ok) throw new Error("expected spawn ok");
    const destroy = store.worker.despawn({
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
    const eng = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng", // senior
      name: "Ada",
    });
    const result = store.worker.spawn({ actorId: eng.id });
    expect(result.ok).toBe(false);
    expect(store.workers()).toHaveLength(0);
    expect(
      store.getEventLog().some((e) => e.type === "worker.spawn.rejected"),
    ).toBe(true);
  });

  it("applies agent.instantiated idempotently", () => {
    const agent = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer",
      name: "Mia",
    });
    store.dispatch({ type: "agent.instantiated", agent, peerIds: [] });
    expect(store.namedAgents()).toHaveLength(1);
  });

  it("updates harness params", () => {
    const agent = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-marketer",
      name: "Mia",
    });
    store.agent.setHarness(agent.id, {
      model: "gpt-5",
      temperature: 0.9,
      effort: 0.1,
    });
    expect(store.getAgent(agent.id)?.harness.model).toBe("gpt-5");
  });

  it("creates a task from an order", () => {
    const nadia = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-dept-head",
      name: "Nadia",
    });
    store.room.assignHead("ws-dev", nadia.id);
    const ada = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng",
      name: "Ada",
    });
    store.agent.order({
      toAgentId: ada.id,
      fromActorId: nadia.id,
      fromKind: "agent",
      instruction: "Ship it",
    });
    expect(store.tasksForAgent(ada.id).map((t) => t.title)).toContain("Ship it");
  });
});

describe("CampusStore — multi-building (campus-scoped)", () => {
  let store: CampusStore;

  beforeEach(() => {
    store = loadedStore();
  });

  it("spawns a new building and a room inside it", () => {
    const beta = store.building.spawn({ name: "Beta Labs" });
    expect(store.getState().buildings).toHaveLength(2);
    expect(store.getBuilding(beta.id)?.name).toBe("Beta Labs");

    const room = store.room.spawn({
      buildingId: beta.id,
      key: "dev",
      name: "Engineering",
      roomId: "room-ops",
      role: "ops",
    });
    expect(store.workspacesOf(beta.id).map((w) => w.id)).toContain(room.id);
    expect(store.getBuilding(beta.id)?.workspaceIds).toContain(room.id);
  });

  it("loans a named agent to another building and returns it home (no cloning)", () => {
    // Beta building with a matching Engineering office.
    const beta = store.building.spawn({ name: "Beta Labs" });
    const betaDev = store.room.spawn({
      buildingId: beta.id,
      key: "dev",
      name: "Engineering",
      roomId: "room-ops",
      role: "ops",
    });

    const ada = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng", // home dept "dev"
      name: "Ada",
    });
    expect(ada.homeProjectId).toBe(sampleProject.id);

    const call = store.agent.callToBuilding({
      agentId: ada.id,
      toBuildingId: beta.id,
    });
    expect(call.ok).toBe(true);

    const moved = store.getAgent(ada.id)!;
    // Same instance — not duplicated.
    expect(store.namedAgents()).toHaveLength(1);
    expect(moved.projectId).toBe(beta.id);
    expect(moved.workspaceId).toBe(betaDev.id); // corresponding office
    expect(moved.activeCallId).not.toBeNull();
    expect(moved.homeProjectId).toBe(sampleProject.id); // home unchanged
    expect(store.agentsAwayFromHome().map((a) => a.id)).toContain(ada.id);

    const back = store.agent.returnHome(ada.id);
    expect(back.ok).toBe(true);
    const home = store.getAgent(ada.id)!;
    expect(home.projectId).toBe(sampleProject.id);
    expect(home.workspaceId).toBe("ws-dev");
    expect(home.activeCallId).toBeNull();
  });

  it("refuses to loan an agent to its own home building", () => {
    const ada = store.agent.spawn({
      projectId: sampleProject.id,
      archetypeId: "arch-systems-eng",
      name: "Ada",
    });
    const result = store.agent.callToBuilding({
      agentId: ada.id,
      toBuildingId: sampleProject.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("same_as_home");
  });
});
