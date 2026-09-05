import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

function seeded() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "b1", name: "Empresa A" });
  store.room.spawn({ id: "r1", buildingId: "b1", key: "dev" });
  store.agent.instantiate({ id: "a1", name: "Ada", buildingId: "b1", roomId: "r1" });
  store.campus.addProvider({ id: "openai", name: "OpenAI", models: ["gpt-x", "gpt-mini"] });
  return store;
}

describe("agent.setHarness (pick provider/model from the catalog)", () => {
  it("sets the harness (provider/model + knobs) validated against the catalog", () => {
    const store = seeded();
    const res = store.agent.setHarness({ agentId: "a1", providerId: "openai", model: "gpt-x", temperature: 0.2 });
    expect(res.ok).toBe(true);
    expect(store.state().agents.find((a) => a.id === "a1")?.harness).toEqual({ providerId: "openai", model: "gpt-x", temperature: 0.2 });
  });

  it("rejects unknown agent, provider, or model not in provider", () => {
    const store = seeded();
    expect(store.agent.setHarness({ agentId: "ghost", providerId: "openai", model: "gpt-x" })).toEqual({ ok: false, reason: "agent_not_found" });
    expect(store.agent.setHarness({ agentId: "a1", providerId: "nope", model: "gpt-x" })).toEqual({ ok: false, reason: "provider_not_found" });
    expect(store.agent.setHarness({ agentId: "a1", providerId: "openai", model: "ghost" })).toEqual({ ok: false, reason: "model_not_in_provider" });
  });
});
