/**
 * Memory (MemPalace) read helpers (pure). Effective recall for an agent =
 * its own agent-scope records + the project (building) records of the building
 * it is currently in.
 */

import type { MemoryRecord, State } from "./types";

export function recallForAgent(state: State, agentId: string): MemoryRecord[] {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return [];
  return state.memories.filter(
    (m) =>
      (m.scope === "agent" && m.ownerId === agentId) ||
      (m.scope === "project" && m.ownerId === agent.buildingId),
  );
}

export function memoriesForOwner(state: State, ownerId: string): MemoryRecord[] {
  return state.memories.filter((m) => m.ownerId === ownerId);
}
