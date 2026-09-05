/**
 * Org-chart rules (pure). Communication cannot skip the hierarchy: only direct
 * supervisor/report or same-rank peers. Debate is same-rank only. Evaluation is
 * done by the direct supervisor (Constitución VI).
 */

import type { AgentInstance } from "./types";

/** True when `a` and `b` are direct supervisor/report of each other. */
export function isDirectLine(a: AgentInstance, b: AgentInstance): boolean {
  return a.supervisorId === b.id || b.supervisorId === a.id;
}

/** Peers: same rank, or sharing the same (non-null) supervisor. */
export function arePeers(a: AgentInstance, b: AgentInstance): boolean {
  if (a.id === b.id) return false;
  if (a.rankKey !== undefined && a.rankKey === b.rankKey) return true;
  return (
    a.supervisorId != null && a.supervisorId === b.supervisorId
  );
}

/** Communication is allowed only on the direct line or between peers. */
export function canCommunicate(a: AgentInstance, b: AgentInstance): boolean {
  if (a.id === b.id) return false;
  return isDirectLine(a, b) || arePeers(a, b);
}

/** Debate is allowed only between same-rank agents. */
export function canDebate(a: AgentInstance, b: AgentInstance): boolean {
  if (a.id === b.id) return false;
  return a.rankKey !== undefined && a.rankKey === b.rankKey;
}

/** Only the direct supervisor may evaluate an assignee's work. */
export function canEvaluate(
  evaluator: AgentInstance,
  assignee: AgentInstance,
): boolean {
  return assignee.supervisorId != null && assignee.supervisorId === evaluator.id;
}
