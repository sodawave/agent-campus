import { describe, expect, it } from "vitest";
import {
  CampusStore,
  bestProfileFor,
  colegasForAgent,
  companerosForAgent,
} from "../src/index";

/**
 * Ámbito por oficio (colegas/compañeros) + rankear.
 * Building "b1" auto-creates a Leader office + leader agent "b1-leader-agent".
 */
function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Demo Co" });
  store.building.spawn({ id: "b1", name: "Alpha" });
  store.room.spawn({ id: "dev", buildingId: "b1", key: "dev" });
  store.room.spawn({ id: "mkt", buildingId: "b1", key: "mkt" });
  // Two devs (same oficio) + one marketer (different oficio).
  store.agent.instantiate({ id: "dev1", name: "Dev One", buildingId: "b1", roomId: "dev", rankKey: "ic", skillKey: "dev", supervisorId: "b1-leader-agent" });
  store.agent.instantiate({ id: "dev2", name: "Dev Two", buildingId: "b1", roomId: "dev", rankKey: "ic", skillKey: "dev", supervisorId: "b1-leader-agent" });
  store.agent.instantiate({ id: "mkt1", name: "Mkt One", buildingId: "b1", roomId: "mkt", rankKey: "ic", skillKey: "mkt", supervisorId: "b1-leader-agent" });
  return store;
}

describe("ámbito por oficio (pure derivations)", () => {
  it("colegas = same oficio (skillKey), excluding self", () => {
    const s = seeded().state();
    expect(colegasForAgent(s, "dev1").map((a) => a.id)).toEqual(["dev2"]);
    // marketer has no same-oficio peer
    expect(colegasForAgent(s, "mkt1").map((a) => a.id)).toEqual([]);
  });

  it("compañeros = rest of the building scope (different oficio)", () => {
    const s = seeded().state();
    // dev1's compañeros: everyone else in b1 except its colega dev2 and itself.
    expect(companerosForAgent(s, "dev1").map((a) => a.id).sort()).toEqual(["b1-leader-agent", "mkt1"]);
  });

  it("colegas ∪ compañeros partition the scope (self excluded)", () => {
    const s = seeded().state();
    const colegas = colegasForAgent(s, "dev1").map((a) => a.id);
    const companeros = companerosForAgent(s, "dev1").map((a) => a.id);
    expect([...colegas, ...companeros].sort()).toEqual(["b1-leader-agent", "dev2", "mkt1"]);
    // disjoint
    expect(colegas.some((id) => companeros.includes(id))).toBe(false);
  });

  it("an agent without oficio has no colegas; everyone else is compañero", () => {
    const store = seeded();
    store.agent.instantiate({ id: "x1", name: "No Craft", buildingId: "b1", roomId: "dev" });
    const s = store.state();
    expect(colegasForAgent(s, "x1")).toEqual([]);
    expect(companerosForAgent(s, "x1").map((a) => a.id)).toContain("dev1");
  });

  it("bestProfileFor prefers a department head, else deterministic first, else null", () => {
    const store = seeded();
    // Make dev2 the head of the dev room -> best same-oficio profile for dev1.
    store.room.assignHead({ roomId: "dev", agentId: "dev2" });
    const s = store.state();
    expect(bestProfileFor(s, "dev1", { sameSkill: true })?.id).toBe("dev2");
    // Cross-oficio (compañeros): no head among them -> deterministic first by id.
    const best = bestProfileFor(s, "dev1", { sameSkill: false });
    expect(best?.id).toBe("b1-leader-agent");
    // mkt1 has no same-oficio colega -> null.
    expect(bestProfileFor(s, "mkt1", { sameSkill: true })).toBeNull();
  });
});

describe("agent.rank (rankear — governed authority)", () => {
  it("the direct supervisor can rank a report", () => {
    const store = seeded();
    expect(store.agent.rank({ agentId: "dev1", rankKey: "lead", byId: "b1-leader-agent" }).ok).toBe(true);
    expect(store.state().agents.find((a) => a.id === "dev1")?.rankKey).toBe("lead");
  });

  it("the building leader can rank an agent even if not its direct supervisor", () => {
    const store = seeded();
    // Re-point dev1's supervisor away from the leader; the leader can still rank.
    store.agent.assignSupervisor({ agentId: "dev1", supervisorId: "dev2" });
    expect(store.agent.rank({ agentId: "dev1", rankKey: "lead", byId: "b1-leader-agent" }).ok).toBe(true);
    expect(store.state().agents.find((a) => a.id === "dev1")?.rankKey).toBe("lead");
  });

  it("a non-supervisor / non-leader cannot rank", () => {
    const store = seeded();
    expect(store.agent.rank({ agentId: "dev1", rankKey: "lead", byId: "mkt1" }))
      .toEqual({ ok: false, reason: "not_supervisor" });
    expect(store.state().agents.find((a) => a.id === "dev1")?.rankKey).toBe("ic");
  });

  it("rejects ranking an unknown agent", () => {
    const store = seeded();
    expect(store.agent.rank({ agentId: "ghost", rankKey: "lead", byId: "b1-leader-agent" }))
      .toEqual({ ok: false, reason: "agent_not_found" });
  });
});
