import { beforeEach, describe, expect, it } from "vitest";

import { CampusCore } from "../src/core/CampusCore";
import { InMemoryCommsBus } from "../src/net/InMemoryCommsBus";
import { CampusServer } from "../src/net/CampusServer";
import { CampusClient } from "../src/net/CampusClient";
import type { CampusCommand } from "../src/domain/types";
import type { CommsChannel } from "../src/domain/comms";
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
  client.replay(server.log()); // catch up to snapshot
  return { core, bus, server, client };
}

const spawnMarketer: CampusCommand = {
  type: "agent.spawn",
  request: { projectId: "proj-demo", archetypeId: "arch-marketer", name: "Mia" },
};
const spawnEngineer: CampusCommand = {
  type: "agent.spawn",
  request: { projectId: "proj-demo", archetypeId: "arch-systems-eng", name: "Ada" },
};

describe("Campus API — core over a transport", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it("T020: a valid command from the client projects identically to the server", async () => {
    await ctx.client.send(spawnMarketer);
    expect(ctx.client.state()).toEqual(ctx.server.state());
    expect(
      ctx.client.state().agents.some((a) => a.skill.key === "marketing"),
    ).toBe(true);
  });

  it("T021: an invalid command is rejected, publishes nothing, no client change", async () => {
    await ctx.client.send(spawnEngineer); // senior
    const eng = ctx.server
      .state()
      .agents.find((a) => a.skill.key === "systems-engineering")!;
    const before = ctx.client.state().agents.length;

    const result = await ctx.client.send({
      type: "worker.spawn",
      actorId: eng.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rank_not_allowed");
    expect(ctx.client.state().agents.length).toBe(before); // nothing published
    expect(ctx.client.state()).toEqual(ctx.server.state());
  });

  it("T022: the boundary crosses JSON; malformed/unknown commands are rejected", async () => {
    expect(await ctx.server.submit("{not json")).toEqual({
      ok: false,
      reason: "invalid_json",
    });
    expect(await ctx.server.submit(JSON.stringify({ type: "bogus" }))).toEqual({
      ok: false,
      reason: "unknown_command",
    });
  });

  it("T023: a second client converges via replay of the log", async () => {
    await ctx.client.send(spawnMarketer);
    const mia = ctx.server
      .state()
      .agents.find((a) => a.skill.key === "marketing")!;
    await ctx.client.send({ type: "worker.spawn", actorId: mia.id });

    const client2 = new CampusClient(ctx.bus, (json) => ctx.server.submit(json));
    client2.replay(ctx.server.log());
    expect(client2.state()).toEqual(ctx.server.state());
  });

  it("T024: duplicate event delivery is idempotent on the projection", async () => {
    await ctx.client.send(spawnMarketer);
    const before = ctx.client.state().agents.length;

    // Re-publish the last agent.instantiated event (simulated retry).
    const dup = [...ctx.server.log()]
      .reverse()
      .find((e) => e.type === "agent.instantiated")!;
    const channel: CommsChannel = { scope: "campus", campusId: "campus" };
    await ctx.bus.publish(channel, dup);

    expect(ctx.client.state().agents.length).toBe(before);
  });
});
