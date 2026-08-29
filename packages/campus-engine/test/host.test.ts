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
import type { AgentInstance } from "../src/domain/types";

function loadedStore(): { store: CampusStore; ada: AgentInstance } {
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
  const ada = store.agent.spawn({
    projectId: sampleProject.id,
    archetypeId: "arch-systems-eng",
    name: "Ada",
  });
  return { store, ada };
}

describe("Host & Runtime (execution plane)", () => {
  let store: CampusStore;
  let ada: AgentInstance;

  beforeEach(() => {
    ({ store, ada } = loadedStore());
  });

  it("FR-001: join registers an online host with lastSeenAt", () => {
    const host = store.host.join({ label: "laptop-ana" });
    expect(store.hosts()).toHaveLength(1);
    const stored = store.getHost(host.id);
    expect(stored?.status).toBe("online");
    expect(stored?.lastSeenAt).toBeTruthy();
    expect(stored?.campusUrl).toBe("local://campus");
  });

  it("FR-002 / SC-001: spawnRuntime makes an agent alive with workingDir", () => {
    const host = store.host.join({ label: "laptop-ana" });
    expect(store.isAlive(ada.id)).toBe(false);

    const res = store.host.spawnRuntime({
      hostId: host.id,
      agentId: ada.id,
      workingDir: "/home/ana/projects/demo",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");

    expect(res.runtime.status).toBe("running");
    expect(res.runtime.workingDir).toBe("/home/ana/projects/demo");
    expect(res.runtime.skillKey).toBe("systems-engineering");

    const alive = store.getAgent(ada.id)!;
    expect(alive.hostId).toBe(host.id);
    expect(alive.runtimeId).toBe(res.runtime.id);
    expect(store.isAlive(ada.id)).toBe(true);
    expect(store.liveAgents().map((a) => a.id)).toContain(ada.id);
    expect(store.runtimesOf(host.id)).toHaveLength(1);
  });

  it("FR-003 / SC-002: a second runtime for the same agent is rejected", () => {
    const host = store.host.join({ label: "laptop-ana" });
    store.host.spawnRuntime({ hostId: host.id, agentId: ada.id });
    const again = store.host.spawnRuntime({ hostId: host.id, agentId: ada.id });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("already_running");
    expect(store.runtimes()).toHaveLength(1);
  });

  it("FR-004 / SC-003: stopRuntime leaves the agent dormant, identity intact", () => {
    const host = store.host.join({ label: "laptop-ana" });
    const spawn = store.host.spawnRuntime({ hostId: host.id, agentId: ada.id });
    if (!spawn.ok) throw new Error("expected ok");

    const stop = store.host.stopRuntime(spawn.runtime.id);
    expect(stop.ok).toBe(true);

    const dormant = store.getAgent(ada.id)!;
    expect(dormant.runtimeId ?? null).toBeNull();
    expect(dormant.hostId ?? null).toBeNull();
    expect(store.isAlive(ada.id)).toBe(false);
    expect(store.runtimes()).toHaveLength(0);
    // identity intact
    expect(dormant.homeProjectId).toBe(sampleProject.id);
    expect(dormant.skill.key).toBe("systems-engineering");
  });

  it("FR-005: heartbeat refreshes lastSeenAt and keeps online", () => {
    const host = store.host.join({ label: "laptop-ana" });
    const before = store.getHost(host.id)!.lastSeenAt;
    store.host.heartbeat(host.id);
    const after = store.getHost(host.id)!;
    expect(after.status).toBe("online");
    expect(after.lastSeenAt >= before).toBe(true);
  });

  it("FR-006 / SC-004: leave takes host offline, stops runtimes, dorms agents", () => {
    const host = store.host.join({ label: "laptop-ana" });
    store.host.spawnRuntime({ hostId: host.id, agentId: ada.id });
    expect(store.isAlive(ada.id)).toBe(true);

    store.host.leave(host.id);

    expect(store.getHost(host.id)?.status).toBe("offline");
    expect(store.runtimesOf(host.id)).toHaveLength(0);
    expect(store.isAlive(ada.id)).toBe(false);
  });

  it("FR-007 / rejections: unknown host/agent/runtime and offline host", () => {
    expect(store.host.spawnRuntime({ hostId: "nope", agentId: ada.id })).toEqual({
      ok: false,
      reason: "unknown_host",
    });
    const host = store.host.join({ label: "laptop-ana" });
    expect(
      store.host.spawnRuntime({ hostId: host.id, agentId: "nope" }),
    ).toEqual({ ok: false, reason: "unknown_agent" });
    expect(store.host.stopRuntime("nope")).toEqual({
      ok: false,
      reason: "unknown_runtime",
    });
    store.host.leave(host.id);
    expect(
      store.host.spawnRuntime({ hostId: host.id, agentId: ada.id }),
    ).toEqual({ ok: false, reason: "host_offline" });
  });

  it("runtime.started is idempotent when reapplied", () => {
    const host = store.host.join({ label: "laptop-ana" });
    const spawn = store.host.spawnRuntime({ hostId: host.id, agentId: ada.id });
    if (!spawn.ok) throw new Error("expected ok");
    store.dispatch({ type: "runtime.started", runtime: spawn.runtime });
    expect(store.runtimes()).toHaveLength(1);
  });
});
