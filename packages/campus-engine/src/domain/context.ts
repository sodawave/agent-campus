/**
 * Resolve home department, project calls, and effective context.
 *
 * Agents stay in their office unless called by another project.
 * On a call they join the corresponding office (naturalDepartmentKey)
 * in the destination building, then return home when the call ends.
 */

import { getRank, suggestSupervisor } from "./org";
import { classificationsForAgent } from "./library";
import { defaultMemoryAddress } from "./memory";
import type {
  AgentArchetype,
  AgentEffectiveContext,
  AgentInstance,
  DepartmentContext,
  DocClassification,
  HarnessParams,
  Id,
  Project,
  ProjectCall,
  Workspace,
} from "./types";
import { DEFAULT_HARNESS_PARAMS } from "./types";

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
    activeCallId: null,
    kind: "named",
    spawnedById: null,
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

/** Default: agent has no active call and should sit in home office. */
export function isStationedAtHome(agent: AgentInstance): boolean {
  return (
    agent.activeCallId === null &&
    agent.projectId === agent.homeProjectId &&
    agent.workspaceId === agent.homeWorkspaceId
  );
}

/**
 * Free roaming between buildings is not allowed.
 * Only a ProjectCall authorizes leaving the home office.
 */
export function canLeaveHomeOffice(agent: AgentInstance): boolean {
  return agent.activeCallId !== null;
}

export function issueProjectCall(input: {
  id: Id;
  fromProjectId: Id;
  agent: AgentInstance;
  reason?: string;
  taskId?: Id;
  now?: string;
}): ProjectCall {
  return {
    id: input.id,
    fromProjectId: input.fromProjectId,
    homeProjectId: input.agent.homeProjectId,
    agentId: input.agent.id,
    reason: input.reason,
    taskId: input.taskId,
    status: "pending",
    createdAt: input.now ?? new Date().toISOString(),
  };
}

/**
 * Accept a call and move into the calling project’s corresponding office.
 * No-op path if already barred (call must be for this agent).
 */
export function acceptProjectCall(
  agent: AgentInstance,
  call: ProjectCall,
  destination: Project,
  destinationWorkspaces: Workspace[],
): AgentInstance {
  if (call.agentId !== agent.id) {
    throw new Error("call_agent_mismatch");
  }
  if (call.fromProjectId === agent.homeProjectId) {
    throw new Error("call_same_as_home");
  }
  const office = resolveCorrespondingOffice(
    destinationWorkspaces,
    destination.id,
    agent.naturalDepartmentKey,
  );
  return {
    ...agent,
    activeCallId: call.id,
    projectId: destination.id,
    workspaceId: office?.id ?? null,
  };
}

/** End call — return to home building and home office. */
export function returnHomeFromCall(agent: AgentInstance): AgentInstance {
  return {
    ...agent,
    activeCallId: null,
    projectId: agent.homeProjectId,
    workspaceId: agent.homeWorkspaceId,
  };
}

/**
 * @deprecated Use acceptProjectCall — agents do not enter buildings without a call.
 */
export function enterBuilding(
  agent: AgentInstance,
  destination: Project,
  destinationWorkspaces: Workspace[],
  call: ProjectCall,
): AgentInstance {
  return acceptProjectCall(agent, call, destination, destinationWorkspaces);
}

export function resolveEffectiveContext(
  agent: AgentInstance,
  currentProject: Project,
  workspaces: Workspace[],
  classifications: DocClassification[] = [],
  campusPalaceId: Id = "palace-campus",
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
    memoryAddress: defaultMemoryAddress(agent, campusPalaceId),
  };
}

export function shouldHomeAfterIntro(
  agent: AgentInstance,
  stayInRoom: boolean,
): boolean {
  if (stayInRoom) return false;
  if (agent.activeCallId) return false;
  if (!agent.homeWorkspaceId) return false;
  if (agent.projectId !== agent.homeProjectId) return false;
  return agent.workspaceId !== agent.homeWorkspaceId;
}
