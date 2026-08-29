import { beforeEach, describe, expect, it } from "vitest";

import { CampusCore } from "../src/core/CampusCore";
import { InMemoryCommsBus } from "../src/net/InMemoryCommsBus";
import { CampusServer } from "../src/net/CampusServer";
import { CampusClient } from "../src/net/CampusClient";
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

function setup() {
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
  const bus = new InMemoryCommsBus();
  const server = new CampusServer(core, bus);
  const client = new CampusClient(bus, (json) => server.submit(json));
  client.replay(server.log());
  return { core, server, client };
}

describe("Wire: UI-facing commands + client read/subscribe", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it("agent.introduce settles an agent's introduction via command", async () => {
    await ctx.client.send({
      type: "agent.spawn",
      request: { projectId: "proj-demo", archetypeId: "arch-marketer", name: "Mia" },
    });
    const mia = ctx.client.read().namedAgents().find((a) => a.name === "Mia")!;
    expect(mia.introducing).toBe(true);
    await ctx.client.send({ type: "agent.introduce", agentId: mia.id });
    expect(ctx.client.read().getAgent(mia.id)!.introducing).toBe(false);
  });

  it("agent.order creates a task in the projection", async () => {
    await ctx.client.send({
      type: "agent.spawn",
      request: { projectId: "proj-demo", archetypeId: "arch-marketer", name: "Mia" },
    });
    const mia = ctx.client.read().namedAgents().find((a) => a.name === "Mia")!;
    await ctx.client.send({
      type: "agent.order",
      toAgentId: mia.id,
      fromActorId: mia.id,
      fromKind: "human",
      instruction: "Ship it",
    });
    expect(ctx.client.read().tasksForAgent(mia.id).map((t) => t.title)).toContain(
      "Ship it",
    );
  });

  it("spec kit commands drive the building's SDD state", async () => {
    await ctx.client.send({ type: "speckit.enable", buildingId: "proj-demo" });
    expect(ctx.client.read().specKitOf("proj-demo")?.phase).toBe("constitution");
    await ctx.client.send({ type: "speckit.advancePhase", buildingId: "proj-demo" });
    expect(ctx.client.read().specKitOf("proj-demo")?.phase).toBe("specify");
    await ctx.client.send({
      type: "speckit.addArtifact",
      buildingId: "proj-demo",
      kind: "spec",
      title: "MVP",
      uri: "specs/mvp.md",
    });
    expect(
      ctx.client.read().specArtifactsOf("proj-demo").some((a) => a.title === "MVP"),
    ).toBe(true);
  });

  it("subscribe fires on projection changes", async () => {
    const seen: CampusEvent[] = [];
    const unsub = ctx.client.subscribe((_s, e) => {
      if (e) seen.push(e);
    });
    await ctx.client.send({
      type: "agent.spawn",
      request: { projectId: "proj-demo", archetypeId: "arch-marketer", name: "Mia" },
    });
    unsub();
    expect(seen.some((e) => e.type === "agent.instantiated")).toBe(true);
  });
});
