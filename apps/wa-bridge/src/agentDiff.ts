import type { AgentRef } from "./types";

/** Named agents present in state that are not yet joined in WorkAdventure. */
export function agentsToJoin(agents: readonly AgentRef[], joinedIds: ReadonlySet<string>): AgentRef[] {
  return agents.filter((a) => a.kind === "named" && !joinedIds.has(a.id));
}
