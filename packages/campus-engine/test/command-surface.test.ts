import { beforeEach, describe, expect, it } from "vitest";

import { CampusCore } from "../src/core/CampusCore";
import { InMemoryCommsBus } from "../src/net/InMemoryCommsBus";
import { CampusServer } from "../src/net/CampusServer";
import { CampusClient } from "../src/net/CampusClient";
import type { AgentInstance } from "../src/domain/types";
import {
  sampleCampus,
  sampleCatalog,
  sampleClassifications,
  sampleDocuments,
  sampleLibrary,
  sampleProject,
  sampleWorkspaces,
} from "../src/samples";

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

function spawnAda(core: CampusCore): AgentInstance {
  core.execute({
    type: "agent.spawn",
    request: { projectId: "proj-demo", archetypeId: "arch-systems-eng", name: "Ada" },
  });
  return core.state().agents.find((a) => a.skill.key === "systems-engineering")!;
}

describe("Command surface expansion", () => {
  let core: CampusCore;

  beforeEach(() => {
    core = loadedCore();
  });

  it("T020: building.spawn + room.spawn grow the campus", () => {
    expect(core.execute({ type: "building.spawn", name: "Beta" }).ok).toBe(true);
    const beta = core.state().buildings.find((b) => b.name === "Beta")!;
    expect(beta).toBeTruthy();
    const r = core.execute({
      type: "room.spawn",
      buildingId: beta.id,
      key: "dev",
      name: "Engineering",
      roomId: "room-ops",
      role: "ops",
    });
    expect(r.ok).toBe(true);
    expect(
      core.state().workspaces.some((w) => w.projectId === beta.id && w.key === "dev"),
    ).toBe(true);
  });

  it("T021: agent.callToBuilding moves the same instance; returnHome brings it back", () => {
    const ada = spawnAda(core);
    core.execute({ type: "building.spawn", name: "Beta" });
    const beta = core.state().buildings.find((b) => b.name === "Beta")!;
    core.execute({
      type: "room.spawn",
      buildingId: beta.id,
      key: "dev",
      name: "Engineering",
      roomId: "room-ops",
      role: "ops",
    });

    expect(
      core.execute({
        type: "agent.callToBuilding",
        agentId: ada.id,
        toBuildingId: beta.id,
      }).ok,
    ).toBe(true);
    expect(core.state().agents.find((a) => a.id === ada.id)!.projectId).toBe(
      beta.id,
    );
    expect(core.state().agents).toHaveLength(1); // not cloned

    expect(core.execute({ type: "agent.returnHome", agentId: ada.id }).ok).toBe(
      true,
    );
    expect(core.state().agents.find((a) => a.id === ada.id)!.projectId).toBe(
      "proj-demo",
    );
  });

  it("T022: callToBuilding to home is rejected (same_as_home), no state change", () => {
    const ada = spawnAda(core);
    const before = core.state().agents.find((a) => a.id === ada.id)!.projectId;
    const r = core.execute({
      type: "agent.callToBuilding",
      agentId: ada.id,
      toBuildingId: "proj-demo",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("same_as_home");
    expect(core.state().agents.find((a) => a.id === ada.id)!.projectId).toBe(
      before,
    );
  });

  it("T023: host.join + host.spawnRuntime; second runtime rejected (already_running)", () => {
    const ada = spawnAda(core);
    expect(core.execute({ type: "host.join", label: "laptop-ana" }).ok).toBe(true);
    const host = core.state().hosts[0]!;
    expect(
      core.execute({
        type: "host.spawnRuntime",
        hostId: host.id,
        agentId: ada.id,
        workingDir: "/w",
      }).ok,
    ).toBe(true);
    expect(core.state().agents.find((a) => a.id === ada.id)!.runtimeId).toBeTruthy();

    const again = core.execute({
      type: "host.spawnRuntime",
      hostId: host.id,
      agentId: ada.id,
    });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("already_running");
  });

  it("T024: over server/client, projection stays identical after new commands", async () => {
    const bus = new InMemoryCommsBus();
    const server = new CampusServer(core, bus);
    const client = new CampusClient(bus, (json) => server.submit(json));
    client.replay(server.log());

    await client.send({ type: "building.spawn", name: "Gamma" });
    await client.send({ type: "host.join", label: "box-1" });
    expect(client.state()).toEqual(server.state());
  });

  it("T025: an unknown command type is rejected by the server", async () => {
    const server = new CampusServer(core, new InMemoryCommsBus());
    expect(await server.submit(JSON.stringify({ type: "nope" }))).toEqual({
      ok: false,
      reason: "unknown_command",
    });
  });
});
