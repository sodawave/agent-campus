/**
 * Execution-plane helpers (pure). An agent is "alive" when it has a live
 * runtime on a host (Constitución: one runtime per agent).
 */

import type { AgentInstance, State } from "./types";

export function isAgentLive(agent: AgentInstance): boolean {
  return agent.runtimeId != null && agent.hostId != null;
}

/** The running runtime for an agent, if any. */
export function liveRuntimeForAgent(state: State, agentId: string) {
  return state.runtimes.find((r) => r.agentId === agentId && r.status === "running");
}
