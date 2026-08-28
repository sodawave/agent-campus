/**
 * Anonymous workers: spawned/destroyed only by último-rango agents (ic).
 * Visualized on the gamification map as anonymous agents entering/leaving campus.
 */

import type {
  AgentInstance,
  HarnessParams,
  Id,
  Project,
  Skill,
  Workspace,
} from "./types";
import { WORKER_SPAWNER_RANK_KEY } from "./types";
import { resolveCorrespondingOffice } from "./context";

export function canSpawnWorkers(actor: AgentInstance): boolean {
  return (
    actor.kind === "named" && actor.rankKey === WORKER_SPAWNER_RANK_KEY
  );
}

export function spawnAnonymousWorker(input: {
  id: Id;
  actor: AgentInstance;
  project: Project;
  workspaces: Workspace[];
  skill: Skill;
  harness?: HarnessParams;
  spriteKey?: string;
  label?: string;
}):
  | { ok: true; worker: AgentInstance }
  | { ok: false; reason: "rank_not_allowed" } {
  if (!canSpawnWorkers(input.actor)) {
    return { ok: false, reason: "rank_not_allowed" };
  }

  const office =
    resolveCorrespondingOffice(
      input.workspaces,
      input.actor.projectId,
      input.actor.naturalDepartmentKey,
    ) ?? null;

  const worker: AgentInstance = {
    id: input.id,
    archetypeId: input.actor.archetypeId,
    kind: "anonymous_worker",
    homeProjectId: input.actor.projectId,
    projectId: input.actor.projectId,
    workspaceId: office?.id ?? input.actor.workspaceId,
    homeWorkspaceId: office?.id ?? input.actor.workspaceId,
    activeCallId: null,
    spawnedById: input.actor.id,
    name: input.label ?? "Worker",
    spriteKey: input.spriteKey ?? "agent-anonymous",
    skill: { ...input.skill },
    naturalDepartmentKey: input.actor.naturalDepartmentKey,
    rankKey: WORKER_SPAWNER_RANK_KEY,
    supervisorId: input.actor.id,
    harness: input.harness ?? { ...input.actor.harness },
    role: "worker",
    mood: "neutral",
    runId: null,
    introducing: false,
  };

  return { ok: true, worker };
}

/** Destroy only if actor is the spawner (or rules later allow dept head). */
export function canDestroyWorker(
  actor: AgentInstance,
  worker: AgentInstance,
): boolean {
  if (worker.kind !== "anonymous_worker") return false;
  if (!canSpawnWorkers(actor)) return false;
  return worker.spawnedById === actor.id;
}
