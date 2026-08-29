import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CampusCore } from "@agent-campus/campus-engine";
import {
  sampleCampus,
  sampleCatalog,
  sampleClassifications,
  sampleDocuments,
  sampleLibrary,
  sampleProject,
  sampleWorkspaces,
} from "@agent-campus/campus-engine";
import { createCampusWsServer, type CampusWsServerHandle } from "../src/server";
import { connectCampusWsClient, type CampusWsClientHandle } from "../src/client";

function loadedCore(): CampusCore {
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
  return core;
}

async function waitUntil(fn: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitUntil timeout");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("Campus WebSocket transport", () => {
  let server: CampusWsServerHandle;
  const clients: CampusWsClientHandle[] = [];

  beforeEach(async () => {
    server = await createCampusWsServer({ core: loadedCore() });
  });

  afterEach(async () => {
    for (const c of clients.splice(0)) await c.close();
    await server.close();
  });

  async function connect(): Promise<CampusWsClientHandle> {
    const client = await connectCampusWsClient(`ws://localhost:${server.port}`);
    clients.push(client);
    return client;
  }

  it("T020: a remote client sends a command and its projection matches the server", async () => {
    const client = await connect();
    await waitUntil(() => client.state().buildings.length >= 1); // caught up via log

    const result = await client.send({ type: "building.spawn", name: "Beta" });
    expect(result.ok).toBe(true);
    await waitUntil(() =>
      client.state().buildings.some((b) => b.name === "Beta"),
    );
    expect(client.state()).toEqual(server.campusServer.state());
  });

  it("T021: an invalid command is rejected and the projection does not change", async () => {
    const client = await connect();
    await client.send({
      type: "agent.spawn",
      request: {
        projectId: "proj-demo",
        archetypeId: "arch-systems-eng",
        name: "Ada",
      },
    });
    await waitUntil(() =>
      client.state().agents.some((a) => a.skill.key === "systems-engineering"),
    );
    const eng = client
      .state()
      .agents.find((a) => a.skill.key === "systems-engineering")!;
    const before = client.state().agents.length;

    const result = await client.send({ type: "worker.spawn", actorId: eng.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rank_not_allowed");
    expect(client.state().agents.length).toBe(before);
  });

  it("T022: two clients converge to the same state", async () => {
    const client1 = await connect();
    await client1.send({ type: "building.spawn", name: "Gamma" });

    const client2 = await connect();
    await waitUntil(() =>
      client2.state().buildings.some((b) => b.name === "Gamma"),
    );
    expect(client2.state()).toEqual(client1.state());
    expect(client2.state()).toEqual(server.campusServer.state());
  });
});
