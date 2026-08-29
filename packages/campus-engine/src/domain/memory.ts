/**
 * Memory scopes — MemPalace as default local-first backend.
 *
 * Mapping (MemPalace → Agent Campus):
 *   Palace  → Campus memory root
 *   Wing    → Project (shared building memory) AND/OR AgentInstance (private)
 *   Room    → Department / topic
 *   Drawer  → Verbatim memory entry
 *
 * Library = documentary RAG by oficio.
 * MemPalace = episodic memory at **agent** and **project** level.
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
  Workspace,
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

export type MemoryScope = "agent" | "project" | "department";

/** Port — MemPalace MCP/CLI is the reference implementation. */
export interface AgentMemoryPort {
  remember(
    drawer: Omit<MemoryDrawer, "id" | "createdAt"> & { id?: Id },
  ): Promise<MemoryDrawer>;
  recall(query: MemoryQuery): Promise<MemoryHit[]>;
  describeAddress(agentId: Id): Promise<MemoryAddress>;
  rememberForProject?(
    drawer: Omit<MemoryDrawer, "id" | "createdAt"> & { id?: Id },
  ): Promise<MemoryDrawer>;
  recallForProject?(
    query: MemoryQuery & { projectId: Id },
  ): Promise<MemoryHit[]>;
}

/** Agent episodic default: wing = home project, room = natural department. */
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

/**
 * Project-level shared wing — building memory for all agents in the project.
 * Room `_general` = whole building; department key = scoped room.
 */
export function projectMemoryAddress(
  project: Project,
  campusPalaceId: Id,
  roomId = "_general",
): MemoryAddress {
  const wingId = project.memoryWingId ?? project.id;
  return {
    palaceId: campusPalaceId,
    wingId,
    roomId,
  };
}

export function departmentMemoryAddress(
  project: Project,
  department: Workspace,
  campusPalaceId: Id,
): MemoryAddress {
  return projectMemoryAddress(project, campusPalaceId, department.key);
}

/** @deprecated Prefer projectMemoryAddress */
export function memoryAddressForProject(
  project: Project,
  campusPalaceId: Id,
  roomId = "_general",
): MemoryAddress {
  return projectMemoryAddress(project, campusPalaceId, roomId);
}

export function resolveMemoryConfig(campusPalaceRef?: string): MemoryConfig {
  if (!campusPalaceRef) return { ...DEFAULT_MEMORY_CONFIG };
  return { ...DEFAULT_MEMORY_CONFIG, palaceRef: campusPalaceRef };
}

/** Recall targets: agent room + project wing + department room. */
export function recallScopesForAgent(
  agent: AgentInstance,
  project: Project,
  campusPalaceId: Id,
): { scope: MemoryScope; address: MemoryAddress }[] {
  return [
    {
      scope: "agent",
      address: defaultMemoryAddress(agent, campusPalaceId),
    },
    {
      scope: "project",
      address: projectMemoryAddress(project, campusPalaceId, "_general"),
    },
    {
      scope: "department",
      address: projectMemoryAddress(
        project,
        campusPalaceId,
        agent.naturalDepartmentKey,
      ),
    },
  ];
}
