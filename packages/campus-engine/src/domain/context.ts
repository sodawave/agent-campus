/**
 * Resolve home department, cross-building moves, and effective context.
 *
 * Project = building. An agent may move between buildings and participate
 * in the office matching naturalDepartmentKey in the destination.
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

/** Find workspace whose key matches the oficio's natural department. */
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

/** Corresponding office in a given building for this oficio. */
export function resolveCorrespondingOffice(
  workspaces: Workspace[],
  projectId: Id,
  naturalDepartmentKey: string,
): Workspace | null {
  return (
    workspaces.find(
      (w) =>
        w.projectId === projectId &&
        w.key === naturalDepartmentKey &&
        w.role !== "hallway",
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
    homeProjectId: input.project.id,
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
 * Move agent into another building and seat them in the corresponding office
 * (same naturalDepartmentKey) if that dpto exists there.
 */
export function enterBuilding(
  agent: AgentInstance,
  destination: Project,
  destinationWorkspaces: Workspace[],
): AgentInstance {
  const office = resolveCorrespondingOffice(
    destinationWorkspaces,
    destination.id,
    agent.naturalDepartmentKey,
  );
  return {
    ...agent,
    projectId: destination.id,
    workspaceId: office?.id ?? null,
  };
}

/**
 * craft ⊕ current building ⊕ corresponding office in that building ⊕ …
 * Always reasons as oficio; never adopts a random visited room's specialization.
 */
export function resolveEffectiveContext(
  agent: AgentInstance,
  currentProject: Project,
  workspaces: Workspace[],
  classifications: DocClassification[] = [],
): AgentEffectiveContext {
  const corresponding = resolveCorrespondingOffice(
    workspaces,
    agent.projectId,
    agent.naturalDepartmentKey,
  );
  const department: DepartmentContext | null =
    corresponding?.context ?? null;

  const rank = getRank(currentProject, agent.rankKey) ?? {
    id: "rank-unknown",
    key: agent.rankKey,
    label: agent.rankKey,
    level: 0,
  };

  return {
    craft: agent.skill,
    building: currentProject.context,
    department,
    homeProjectId: agent.homeProjectId,
    homeWorkspaceId: agent.homeWorkspaceId,
    currentProjectId: agent.projectId,
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
  if (agent.projectId !== agent.homeProjectId) return false;
  return agent.workspaceId !== agent.homeWorkspaceId;
}
