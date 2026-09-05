import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

function withCampus() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  return store;
}

describe("AI providers/models config catalog", () => {
  it("adds providers (upsert) with their models", () => {
    const store = withCampus();
    expect(store.campus.addProvider({ id: "openai", name: "OpenAI", models: ["gpt-x", "gpt-mini"] }).ok).toBe(true);
    expect(store.state().config.providers).toEqual([{ id: "openai", name: "OpenAI", models: ["gpt-x", "gpt-mini"] }]);
    // upsert replaces by id
    store.campus.addProvider({ id: "openai", name: "OpenAI", models: ["gpt-x", "gpt-mini", "gpt-nano"] });
    expect(store.state().config.providers[0]?.models).toEqual(["gpt-x", "gpt-mini", "gpt-nano"]);
  });

  it("sets a default model that exists in a provider", () => {
    const store = withCampus();
    store.campus.addProvider({ id: "anthropic", name: "Anthropic", models: ["claude-x"] });
    expect(store.campus.setDefaultModel({ providerId: "anthropic", model: "claude-x" }).ok).toBe(true);
    expect(store.state().config.defaultModel).toEqual({ providerId: "anthropic", model: "claude-x" });
  });

  it("rejects default model for unknown provider or unknown model", () => {
    const store = withCampus();
    store.campus.addProvider({ id: "openai", name: "OpenAI", models: ["gpt-x"] });
    expect(store.campus.setDefaultModel({ providerId: "nope", model: "gpt-x" })).toEqual({ ok: false, reason: "provider_not_found" });
    expect(store.campus.setDefaultModel({ providerId: "openai", model: "ghost" })).toEqual({ ok: false, reason: "model_not_in_provider" });
  });

  it("removeProvider clears the default model if it pointed there", () => {
    const store = withCampus();
    store.campus.addProvider({ id: "openai", name: "OpenAI", models: ["gpt-x"] });
    store.campus.setDefaultModel({ providerId: "openai", model: "gpt-x" });
    expect(store.campus.removeProvider({ providerId: "openai" }).ok).toBe(true);
    expect(store.state().config.providers).toEqual([]);
    expect(store.state().config.defaultModel).toBeNull();
  });

  it("addProvider requires a loaded campus", () => {
    const store = new CampusStore();
    expect(store.campus.addProvider({ id: "x", name: "X", models: [] })).toEqual({ ok: false, reason: "campus_not_loaded" });
  });
});
