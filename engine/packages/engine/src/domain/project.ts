/**
 * Project helpers (pure). The inventory of a building = its projects.
 */

import type { AgentInstance, Project, State } from "./types";

/** The project inventory of a building. */
export function projectsForBuilding(state: State, buildingId: string): Project[] {
  return state.projects.filter((p) => p.buildingId === buildingId);
}

/** Projects an agent is assigned to (they "appear on" the agent). */
export function projectsForAgent(state: State, agentId: string): Project[] {
  const ids = new Set(
    state.assignments.filter((a) => a.agentId === agentId).map((a) => a.projectId),
  );
  return state.projects.filter((p) => ids.has(p.id));
}

/** Agents assigned to a project. */
export function agentsForProject(state: State, projectId: string): AgentInstance[] {
  const ids = new Set(
    state.assignments.filter((a) => a.projectId === projectId).map((a) => a.agentId),
  );
  return state.agents.filter((a) => ids.has(a.id));
}
