import { describe, expect, it } from "vitest";

import {
  arePeers,
  canCommunicate,
  canDebate,
  canEvaluate,
  isInSupervisorChain,
} from "../src/domain/org";
import { sampleProject } from "../src/samples";
import type { AgentInstance } from "../src/domain/types";

function agent(id: string, rankKey: string, supervisorId: string | null): AgentInstance {
  return {
    id,
    archetypeId: "arch",
    kind: "named",
    homeProjectId: sampleProject.id,
    projectId: sampleProject.id,
    workspaceId: "ws-dev",
    homeWorkspaceId: "ws-dev",
    activeCallId: null,
    spawnedById: null,
    name: id,
    spriteKey: "agent",
    skill: { id: "s", key: "systems-engineering", label: "Eng" },
    naturalDepartmentKey: "dev",
    rankKey,
    supervisorId,
    harness: { model: "m", temperature: 0.2, effort: 0.5 },
    role: "worker",
    mood: "neutral",
    runId: null,
  };
}

const head = agent("head", "head", null);
const ic1 = agent("ic1", "ic", "head");
const ic2 = agent("ic2", "ic", "head");
const senior = agent("senior", "senior", "head");
const agents = [head, ic1, ic2, senior];

describe("org chart rules (TECH_SPEC §2)", () => {
  it("peers share a rank level", () => {
    expect(arePeers(sampleProject, ic1, ic2)).toBe(true);
    expect(arePeers(sampleProject, ic1, senior)).toBe(false);
  });

  it("debate only allowed between same-rank peers", () => {
    expect(canDebate(sampleProject, agents, ["ic1", "ic2"]).ok).toBe(true);
    const mismatch = canDebate(sampleProject, agents, ["ic1", "senior"]);
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.reason).toBe("rank_mismatch");
  });

  it("communication only along a direct reporting edge or between peers", () => {
    expect(canCommunicate(sampleProject, agents, "ic1", "head").ok).toBe(true);
    expect(canCommunicate(sampleProject, agents, "ic1", "ic2").ok).toBe(true);
    const skip = canCommunicate(sampleProject, agents, "ic1", "senior");
    expect(skip.ok).toBe(false);
  });

  it("only the direct supervisor may evaluate", () => {
    expect(canEvaluate(agents, "head", "ic1").ok).toBe(true);
    expect(canEvaluate(agents, "senior", "ic1").ok).toBe(false);
  });

  it("tracks supervisor chains", () => {
    expect(isInSupervisorChain(agents, "ic1", "head")).toBe(true);
    expect(isInSupervisorChain(agents, "head", "ic1")).toBe(false);
  });
});
