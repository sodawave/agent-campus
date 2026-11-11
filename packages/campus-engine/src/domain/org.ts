/**
 * Org-chart rules (pure). Communication cannot skip the hierarchy: only direct
 * supervisor/report or same-rank peers. Debate is same-rank only. Evaluation is
 * done by the direct supervisor (Constitución VI).
 */

import type { AgentInstance, Id, State } from "./types";

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

/**
 * Ámbito de un agente: los agentes nombrados del **mismo building**, excluyendo
 * el propio. Los workers anónimos viven en `state.workers` y no cuentan aquí.
 */
function scopeForAgent(state: State, agentId: Id): AgentInstance[] {
  const self = state.agents.find((a) => a.id === agentId);
  if (!self) return [];
  return state.agents.filter((a) => a.id !== self.id && a.buildingId === self.buildingId);
}

/**
 * Colegas: mismo oficio (`skillKey`) dentro del ámbito. Requiere un `skillKey`
 * definido en el agente (sin oficio no hay "mismo oficio"). Para debate/split.
 */
export function colegasForAgent(state: State, agentId: Id): AgentInstance[] {
  const self = state.agents.find((a) => a.id === agentId);
  if (!self || self.skillKey === undefined) return [];
  return scopeForAgent(state, agentId).filter((a) => a.skillKey === self.skillKey);
}

/**
 * Compañeros: el resto del ámbito (oficio distinto). Partición con `colegas`:
 * `colegas ∪ companeros = ámbito \ {self}`, disjuntos.
 */
export function companerosForAgent(state: State, agentId: Id): AgentInstance[] {
  const self = state.agents.find((a) => a.id === agentId);
  if (!self) return [];
  const sameOficio = (a: AgentInstance): boolean =>
    self.skillKey !== undefined && a.skillKey === self.skillKey;
  return scopeForAgent(state, agentId).filter((a) => !sameOficio(a));
}

/**
 * "Mejor perfil" para consultar/debatir: entre los candidatos (colegas si
 * `sameSkill`, si no compañeros) prefiere un **jefe de departamento**
 * (`room.headAgentId`); si no hay, el primero determinista por id; `null` si no
 * hay candidatos.
 */
export function bestProfileFor(
  state: State,
  agentId: Id,
  opts: { sameSkill: boolean },
): AgentInstance | null {
  const candidates = (opts.sameSkill ? colegasForAgent : companerosForAgent)(state, agentId)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (candidates.length === 0) return null;
  const heads = new Set(
    state.rooms.map((r) => r.headAgentId).filter((id): id is Id => id !== undefined),
  );
  return candidates.find((a) => heads.has(a.id)) ?? candidates[0]!;
}

/**
 * Autoridad para rankear a un agente: su **supervisor directo**, o el **leader
 * del building** (no por auto-asignación vía la vía de leader).
 */
export function canRank(state: State, agent: AgentInstance, byId: Id): boolean {
  const isSupervisor = agent.supervisorId != null && agent.supervisorId === byId;
  const building = state.buildings.find((b) => b.id === agent.buildingId);
  const leaderId = building?.leaderAgentId ?? null;
  const isLeader = leaderId != null && leaderId === byId && byId !== agent.id;
  return isSupervisor || isLeader;
}
