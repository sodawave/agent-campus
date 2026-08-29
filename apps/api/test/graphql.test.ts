import { describe, expect, it } from "vitest";
import { CampusClient, CampusServer, createInMemoryPair } from "@agent-campus/campus-engine";
import { executeGraphql } from "../src/graphql";
import type { CampusLink } from "../src/link";

function memLink(): CampusLink {
  const server = new CampusServer();
  const s = server.store;
  s.campus.load({ id: "c1", name: "Demo Co" });
  s.building.spawn({ id: "b1", name: "Alpha" });
  const [srv, cli] = createInMemoryPair();
  server.handle(srv);
  const client = new CampusClient(cli);
  return { send: (cmd) => client.send(cmd), state: () => client.state() };
}

describe("GraphQL surface", () => {
  it("queries campus name, config, buildings", async () => {
    const link = memLink();
    const res = await executeGraphql(link, `{ campus { name config { language timezone } buildings { id name } } }`);
    expect(res.errors).toBeUndefined();
    const campus = (res.data as any).campus;
    expect(campus.name).toBe("Demo Co");
    expect(campus.config).toEqual({ language: "en", timezone: "UTC" });
    expect(campus.buildings.map((b: { id: string }) => b.id)).toContain("b1");
  });

  it("setConfig mutation updates config", async () => {
    const link = memLink();
    const m = await executeGraphql(link, `mutation { setConfig(language: "es") { ok event } }`);
    expect((m.data as any).setConfig.ok).toBe(true);
    const q = await executeGraphql(link, `{ campus { config { language timezone } } }`);
    expect((q.data as any).campus.config).toEqual({ language: "es", timezone: "UTC" });
  });

  it("createProject mutation adds a project", async () => {
    const link = memLink();
    const m = await executeGraphql(link, `mutation($id: ID!, $b: ID!, $n: String!) { createProject(id: $id, buildingId: $b, name: $n) { ok event } }`, { id: "p1", b: "b1", n: "Onboarding" });
    expect((m.data as any).createProject).toEqual({ ok: true, event: "project.created" });
    const q = await executeGraphql(link, `{ campus { projects { id name status } } }`);
    expect((q.data as any).campus.projects.map((p: { id: string }) => p.id)).toContain("p1");
  });

  it("mutation returns a rejection reason", async () => {
    const link = memLink();
    const m = await executeGraphql(link, `mutation { createProject(id: "p1", buildingId: "nope", name: "X") { ok reason } }`);
    expect((m.data as any).createProject).toEqual({ ok: false, reason: "building_not_found" });
  });

  it("manages AI providers + default model", async () => {
    const link = memLink();
    const add = await executeGraphql(
      link,
      `mutation($m: [String!]!) { addProvider(id: "openai", name: "OpenAI", models: $m) { ok event } }`,
      { m: ["gpt-x", "gpt-mini"] },
    );
    expect((add.data as any).addProvider.ok).toBe(true);
    const setD = await executeGraphql(link, `mutation { setDefaultModel(providerId: "openai", model: "gpt-x") { ok } }`);
    expect((setD.data as any).setDefaultModel.ok).toBe(true);
    const q = await executeGraphql(link, `{ campus { config { providers { id models } defaultModel { providerId model } } } }`);
    const cfg = (q.data as any).campus.config;
    expect(cfg.providers).toEqual([{ id: "openai", models: ["gpt-x", "gpt-mini"] }]);
    expect(cfg.defaultModel).toEqual({ providerId: "openai", model: "gpt-x" });
  });

  it("stores a provider token as a secret (hasToken flag; value never in state)", async () => {
    const link = memLink();
    const secrets = new Map<string, string>();
    await executeGraphql(link, `mutation($m: [String!]!) { addProvider(id: "openai", name: "OpenAI", models: $m) { ok } }`, { m: ["gpt-x"] }, secrets);
    // Before: no token.
    const q0 = await executeGraphql(link, `{ campus { config { providers { id hasToken } } } }`, undefined, secrets);
    expect((q0.data as any).campus.config.providers).toEqual([{ id: "openai", hasToken: false }]);
    // Set a token: it lands in the server secret store, not in the campus state.
    const set = await executeGraphql(link, `mutation { setProviderToken(providerId: "openai", token: "sk-secret") { ok event } }`, undefined, secrets);
    expect((set.data as any).setProviderToken.ok).toBe(true);
    expect(secrets.get("openai")).toBe("sk-secret");
    const q1 = await executeGraphql(link, `{ campus { config { providers { id hasToken } } } }`, undefined, secrets);
    expect((q1.data as any).campus.config.providers).toEqual([{ id: "openai", hasToken: true }]);
    // The raw token is never present in the projected state / event log.
    expect(JSON.stringify(link.state())).not.toContain("sk-secret");
    // Clearing the token flips the flag off and removes it from the store.
    const clear = await executeGraphql(link, `mutation { setProviderToken(providerId: "openai", token: "") { ok } }`, undefined, secrets);
    expect((clear.data as any).setProviderToken.ok).toBe(true);
    expect(secrets.has("openai")).toBe(false);
    const q2 = await executeGraphql(link, `{ campus { config { providers { id hasToken } } } }`, undefined, secrets);
    expect((q2.data as any).campus.config.providers).toEqual([{ id: "openai", hasToken: false }]);
  });

  it("setProviderToken rejects an unknown provider", async () => {
    const link = memLink();
    const m = await executeGraphql(link, `mutation { setProviderToken(providerId: "ghost", token: "x") { ok reason } }`);
    expect((m.data as any).setProviderToken).toEqual({ ok: false, reason: "provider_not_found" });
  });
});
