/**
 * Resolve home department and effective context for an instance.
 */

import { getRank, suggestSupervisor } from "./org";
import { classificationsForAgent } from "./library";
import type {
  AgentArchetype,
  AgentEffectiveContext,
  AgentInstance,
  DepartmentContext,
  DocClassification,
  HarnessParams,
  Id,
  Project,
  Workspace,
} from "./types";
import { DEFAULT_HARNESS_PARAMS } from "./types";

/** Find workspace whose key matches the archetype's natural department. */
export function resolveHomeWorkspace(
  workspaces: Workspace[],
  naturalDepartmentKey: string,
): Workspace | null {
  return (
    workspaces.find(
      (w) => w.key === naturalDepartmentKey && w.role !== "hallway",
    ) ?? null
  );
}

function mergeHarness(
  base: HarnessParams,
  override?: Partial<HarnessParams>,
): HarnessParams {
  return { ...DEFAULT_HARNESS_PARAMS, ...base, ...override };
}

export function buildAgentInstance(input: {
  id: Id;
  archetype: AgentArchetype;
  project: Project;
  workspaces: Workspace[];
  name: string;
  spawnWorkspaceId?: Id;
  stayInRoom?: boolean;
  rankKey?: string;
  supervisorId?: Id;
  harness?: Partial<HarnessParams>;
}): AgentInstance {
  const home = resolveHomeWorkspace(
    input.workspaces,
    input.archetype.naturalDepartmentKey,
  );
  const homeWorkspaceId = home?.id ?? null;

  const stay = input.stayInRoom === true;
  const workspaceId = stay
    ? (input.spawnWorkspaceId ?? homeWorkspaceId)
    : (homeWorkspaceId ?? input.spawnWorkspaceId ?? null);

  const draft: Pick<AgentInstance, "homeWorkspaceId" | "workspaceId"> = {
    homeWorkspaceId,
    workspaceId,
  };

  const rankKey = input.rankKey ?? input.archetype.defaultRankKey ?? "ic";

  return {
    id: input.id,
    archetypeId: input.archetype.id,
    projectId: input.project.id,
    workspaceId,
    homeWorkspaceId,
    name: input.name,
    spriteKey: input.archetype.spriteKey,
    skill: { ...input.archetype.skill },
    naturalDepartmentKey: input.archetype.naturalDepartmentKey,
    rankKey,
    supervisorId:
      input.supervisorId ??
      suggestSupervisor(draft, input.workspaces, input.project),
    harness: mergeHarness(input.archetype.defaultHarness, input.harness),
    role: input.archetype.defaultRole ?? "worker",
    mood: "neutral",
    runId: null,
    introducing: true,
  };
}

/**
 * craft ⊕ building ⊕ home dept ⊕ harness ⊕ rank ⊕ library (by oficio).
 *
 * Visiting another room does NOT change reasoning: always oficio + home + building.
 * Library access is by skill.key — shared across buildings with the same craft.
 */
export function resolveEffectiveContext(
  agent: AgentInstance,
  project: Project,
  workspaces: Workspace[],
  classifications: DocClassification[] = [],
): AgentEffectiveContext {
  const home =
    workspaces.find((w) => w.id === agent.homeWorkspaceId) ?? null;
  const department: DepartmentContext | null = home?.context ?? null;

  const rank = getRank(project, agent.rankKey) ?? {
    id: "rank-unknown",
    key: agent.rankKey,
    label: agent.rankKey,
    level: 0,
  };

  return {
    craft: agent.skill,
    building: project.context,
    department,
    homeWorkspaceId: agent.homeWorkspaceId,
    currentWorkspaceId: agent.workspaceId,
    harness: agent.harness,
    rank,
    supervisorId: agent.supervisorId,
    libraryClassifications: classificationsForAgent(classifications, agent),
  };
}

export function shouldHomeAfterIntro(
  agent: AgentInstance,
  stayInRoom: boolean,
): boolean {
  if (stayInRoom) return false;
  if (!agent.homeWorkspaceId) return false;
  return agent.workspaceId !== agent.homeWorkspaceId;
}
