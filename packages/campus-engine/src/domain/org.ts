/**
 * Org-chart rules: peers debate, no hierarchy skip, supervisor evaluates.
 */

import type {
  AgentInstance,
  DebateSession,
  EvaluationVerdict,
  Id,
  Project,
  Rank,
  Run,
  TaskEvaluation,
  Workspace,
} from "./types";

export function getRank(project: Project, rankKey: string): Rank | null {
  return project.ranks.find((r) => r.key === rankKey) ?? null;
}

export function rankLevel(project: Project, agent: AgentInstance): number {
  return getRank(project, agent.rankKey)?.level ?? 0;
}

/** Same rank level ⇒ peers (may debate). */
export function arePeers(
  project: Project,
  a: AgentInstance,
  b: AgentInstance,
): boolean {
  return rankLevel(project, a) === rankLevel(project, b);
}

/** a reports (directly or via chain) under b. */
export function isInSupervisorChain(
  agents: AgentInstance[],
  subordinateId: Id,
  potentialSupervisorId: Id,
  maxHops = 16,
): boolean {
  let current = agents.find((x) => x.id === subordinateId);
  let hops = 0;
  while (current?.supervisorId && hops < maxHops) {
    if (current.supervisorId === potentialSupervisorId) return true;
    current = agents.find((x) => x.id === current!.supervisorId);
    hops += 1;
  }
  return false;
}

/**
 * Direct communication / assignment only along the reporting edge
 * (supervisor ↔ direct report) or between peers.
 * Skipping levels is forbidden.
 */
export function canCommunicate(
  project: Project,
  agents: AgentInstance[],
  fromId: Id,
  toId: Id,
): { ok: true } | { ok: false; reason: string } {
  if (fromId === toId) return { ok: false, reason: "same_agent" };
  const from = agents.find((a) => a.id === fromId);
  const to = agents.find((a) => a.id === toId);
  if (!from || !to) return { ok: false, reason: "unknown_agent" };

  if (arePeers(project, from, to)) return { ok: true };

  // Direct edge only — no skip.
  if (from.supervisorId === to.id || to.supervisorId === from.id) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "hierarchy_skip: communicate only with peers or direct supervisor/report",
  };
}

export function canDebate(
  project: Project,
  agents: AgentInstance[],
  participantIds: Id[],
): { ok: true } | { ok: false; reason: "rank_mismatch" | "not_enough" | "unknown_agent" } {
  if (participantIds.length < 2) return { ok: false, reason: "not_enough" };
  const parts = participantIds.map((id) => agents.find((a) => a.id === id));
  if (parts.some((p) => !p)) return { ok: false, reason: "unknown_agent" };

  const levels = new Set(
    parts.map((p) => rankLevel(project, p as AgentInstance)),
  );
  if (levels.size !== 1) return { ok: false, reason: "rank_mismatch" };
  return { ok: true };
}

export function openDebate(input: {
  id: Id;
  projectId: Id;
  workspaceId: Id | null;
  participantIds: Id[];
  topic: string;
  now?: string;
}): DebateSession {
  return {
    id: input.id,
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    participantIds: input.participantIds,
    topic: input.topic,
    status: "open",
    createdAt: input.now ?? new Date().toISOString(),
  };
}

/**
 * Only the assignee's supervisor (direct) may evaluate the task.
 * (Dept head evaluates via being set as supervisorId on members.)
 */
export function canEvaluate(
  agents: AgentInstance[],
  evaluatorId: Id,
  assigneeId: Id,
): { ok: true } | { ok: false; reason: string } {
  const assignee = agents.find((a) => a.id === assigneeId);
  if (!assignee) return { ok: false, reason: "unknown_assignee" };
  if (assignee.supervisorId !== evaluatorId) {
    return {
      ok: false,
      reason: "only_direct_supervisor_may_evaluate",
    };
  }
  return { ok: true };
}

export function evaluateTask(input: {
  id: Id;
  run: Run;
  evaluatorId: Id;
  assigneeId: Id;
  verdict: EvaluationVerdict;
  score?: number;
  feedback?: string;
  now?: string;
}): TaskEvaluation {
  return {
    id: input.id,
    runId: input.run.id,
    evaluatorId: input.evaluatorId,
    assigneeId: input.assigneeId,
    verdict: input.verdict,
    score: input.score,
    feedback: input.feedback,
    createdAt: input.now ?? new Date().toISOString(),
  };
}

/** Suggest supervisor: dept head if present, else campus lead. */
export function suggestSupervisor(
  agent: Pick<AgentInstance, "homeWorkspaceId" | "workspaceId">,
  workspaces: Workspace[],
  project: Project,
): Id | null {
  const wsId = agent.homeWorkspaceId ?? agent.workspaceId;
  const ws = workspaces.find((w) => w.id === wsId);
  return ws?.headAgentId ?? project.campusLeadAgentId ?? null;
}

/** True if agent is head of their home/current department. */
export function isDepartmentHead(
  agent: AgentInstance,
  workspaces: Workspace[],
): boolean {
  return workspaces.some((w) => w.headAgentId === agent.id);
}
