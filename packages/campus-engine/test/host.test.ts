import { describe, expect, it } from "vitest";
import { CampusStore, isAgentLive } from "../src/index";

function seededStore() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Mia", buildingId: "b1", roomId: "r1" });
  return store;
}

describe("host join/leave + runtime start/stop (execution plane)", () => {
  it("starting a runtime makes the agent live (host + runtime set)", () => {
    const store = seededStore();
    expect(store.host.join({ id: "h1", label: "laptop" }).ok).toBe(true);
    const res = store.runtime.start({ id: "rt1", hostId: "h1", agentId: "a1", workingDir: "/tmp/x" });
    expect(res.ok).toBe(true);
    const a = store.state().agents.find((x) => x.id === "a1")!;
    expect(a.hostId).toBe("h1");
    expect(a.runtimeId).toBe("rt1");
    expect(isAgentLive(a)).toBe(true);
    expect(store.state().runtimes[0]).toMatchObject({ id: "rt1", status: "running", workingDir: "/tmp/x" });
  });

  it("one runtime per agent — second start is rejected while alive", () => {
    const store = seededStore();
    store.host.join({ id: "h1", label: "laptop" });
    store.runtime.start({ id: "rt1", hostId: "h1", agentId: "a1" });
    expect(store.runtime.start({ id: "rt2", hostId: "h1", agentId: "a1" }))
      .toEqual({ ok: false, reason: "agent_already_live" });
  });

  it("stopping a runtime takes the agent offline and allows a restart", () => {
    const store = seededStore();
    store.host.join({ id: "h1", label: "laptop" });
    store.runtime.start({ id: "rt1", hostId: "h1", agentId: "a1" });
    expect(store.runtime.stop({ runtimeId: "rt1" }).ok).toBe(true);
    const a = store.state().agents.find((x) => x.id === "a1")!;
    expect(a.hostId).toBeNull();
    expect(a.runtimeId).toBeNull();
    expect(isAgentLive(a)).toBe(false);
    // can start again after stop
    expect(store.runtime.start({ id: "rt2", hostId: "h1", agentId: "a1" }).ok).toBe(true);
  });

  it("host.leave stops its runtimes and takes those agents offline", () => {
    const store = seededStore();
    store.host.join({ id: "h1", label: "laptop" });
    store.runtime.start({ id: "rt1", hostId: "h1", agentId: "a1" });
    expect(store.host.leave({ hostId: "h1" }).ok).toBe(true);
    expect(store.state().hosts).toHaveLength(0);
    expect(store.state().runtimes[0]?.status).toBe("stopped");
    const a = store.state().agents.find((x) => x.id === "a1")!;
    expect(isAgentLive(a)).toBe(false);
  });

  it("rejects unknown host, offline host, unknown agent and unknown runtime", () => {
    const store = seededStore();
    expect(store.runtime.start({ id: "rt1", hostId: "nope", agentId: "a1" }))
      .toEqual({ ok: false, reason: "host_not_found" });
    store.host.join({ id: "h1", label: "laptop" });
    expect(store.runtime.start({ id: "rt1", hostId: "h1", agentId: "ghost" }))
      .toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.runtime.stop({ runtimeId: "ghost" }))
      .toEqual({ ok: false, reason: "runtime_not_found" });
    expect(store.host.leave({ hostId: "nope" }))
      .toEqual({ ok: false, reason: "host_not_found" });
    expect(store.host.join({ id: "h1", label: "dup" }))
      .toEqual({ ok: false, reason: "duplicate_id" });
  });
});
