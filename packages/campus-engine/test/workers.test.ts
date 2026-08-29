import { describe, expect, it } from "vitest";

import {
  canDestroyWorker,
  canSpawnWorkers,
  spawnAnonymousWorker,
} from "../src/domain/workers";
import { buildAgentInstance } from "../src/domain/context";
import { sampleCatalog, sampleProject, sampleWorkspaces } from "../src/samples";
import type { AgentArchetype } from "../src/domain/types";

function archetype(id: string): AgentArchetype {
  const a = sampleCatalog.find((x) => x.id === id);
  if (!a) throw new Error(`missing archetype ${id}`);
  return a;
}

function instance(archetypeId: string, id: string, rankKey?: string) {
  return buildAgentInstance({
    id,
    archetype: archetype(archetypeId),
    project: sampleProject,
    workspaces: sampleWorkspaces,
    name: id,
    rankKey,
  });
}

describe("anonymous workers (TECH_SPEC §2, acceptance §3-4)", () => {
  it("only lowest-rank (ic) named agents may spawn workers", () => {
    const marketer = instance("arch-marketer", "mkt-1"); // defaultRankKey ic
    const engineer = instance("arch-systems-eng", "eng-1"); // senior

    expect(canSpawnWorkers(marketer)).toBe(true);
    expect(canSpawnWorkers(engineer)).toBe(false);
  });

  it("spawnAnonymousWorker succeeds for ic and produces a worker instance", () => {
    const marketer = instance("arch-marketer", "mkt-1");
    const result = spawnAnonymousWorker({
      id: "worker-1",
      actor: marketer,
      project: sampleProject,
      workspaces: sampleWorkspaces,
      skill: marketer.skill,
      label: "Helper",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.worker.kind).toBe("anonymous_worker");
      expect(result.worker.spawnedById).toBe("mkt-1");
      expect(result.worker.name).toBe("Helper");
    }
  });

  it("rejects spawn for a non-ic actor", () => {
    const engineer = instance("arch-systems-eng", "eng-1");
    const result = spawnAnonymousWorker({
      id: "worker-x",
      actor: engineer,
      project: sampleProject,
      workspaces: sampleWorkspaces,
      skill: engineer.skill,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rank_not_allowed");
  });

  it("only the spawner may destroy their worker", () => {
    const marketer = instance("arch-marketer", "mkt-1");
    const other = instance("arch-marketer", "mkt-2");
    const spawn = spawnAnonymousWorker({
      id: "worker-1",
      actor: marketer,
      project: sampleProject,
      workspaces: sampleWorkspaces,
      skill: marketer.skill,
    });
    if (!spawn.ok) throw new Error("expected spawn ok");

    expect(canDestroyWorker(marketer, spawn.worker)).toBe(true);
    expect(canDestroyWorker(other, spawn.worker)).toBe(false);
    expect(canDestroyWorker(marketer, marketer)).toBe(false); // not a worker
  });
});
