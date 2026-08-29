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
});
