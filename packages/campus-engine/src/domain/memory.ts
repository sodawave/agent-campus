/**
 * Agent memory — MemPalace as the default local-first backend.
 *
 * Mapping (MemPalace → Agent Campus):
 *   Palace  → Campus memory root
 *   Wing    → Project (building) and/or AgentInstance
 *   Room    → Department / topic
 *   Drawer  → Verbatim memory entry
 *
 * Library = documentary RAG by oficio.
 * MemPalace = episodic / conversational memory for agents.
 *
 * Base: https://github.com/MemPalace/mempalace
 */

import type {
  AgentInstance,
  Id,
  MemoryAddress,
  MemoryConfig,
  MemoryDrawer,
  MemoryHit,
  MemoryQuery,
  Project,
} from "./types";
import { DEFAULT_MEMORY_CONFIG } from "./types";

export type {
  MemoryAddress,
  MemoryConfig,
  MemoryDrawer,
  MemoryHit,
  MemoryQuery,
};
export { DEFAULT_MEMORY_CONFIG };

/** Port — MemPalace MCP/CLI is the reference implementation. */
export interface AgentMemoryPort {
  remember(
    drawer: Omit<MemoryDrawer, "id" | "createdAt"> & { id?: Id },
  ): Promise<MemoryDrawer>;
  recall(query: MemoryQuery): Promise<MemoryHit[]>;
  describeAddress(agentId: Id): Promise<MemoryAddress>;
}

/** Default: wing = home project, room = natural department. */
export function defaultMemoryAddress(
  agent: AgentInstance,
  campusPalaceId: Id,
): MemoryAddress {
  return {
    palaceId: campusPalaceId,
    wingId: agent.homeProjectId,
    roomId: agent.naturalDepartmentKey,
  };
}

/** Private wing per agent (isolation mode). */
export function privateAgentWingAddress(
  agent: AgentInstance,
  campusPalaceId: Id,
): MemoryAddress {
  return {
    palaceId: campusPalaceId,
    wingId: agent.id,
    roomId: agent.naturalDepartmentKey,
  };
}

export function memoryAddressForProject(
  project: Project,
  campusPalaceId: Id,
  roomId = "_general",
): MemoryAddress {
  return {
    palaceId: campusPalaceId,
    wingId: project.id,
    roomId,
  };
}

export function resolveMemoryConfig(campusPalaceRef?: string): MemoryConfig {
  if (!campusPalaceRef) return { ...DEFAULT_MEMORY_CONFIG };
  return { ...DEFAULT_MEMORY_CONFIG, palaceRef: campusPalaceRef };
}
