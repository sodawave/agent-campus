/**
 * Constructors for the transversal entities: Campus → Building (Project) → Room (Workspace).
 *
 * A "building" is a Project: transversal to its rooms (departments / oficios),
 * exactly like a real company. The campus map shows the active buildings; each
 * building owns its rooms. Agents are never duplicated across buildings — a
 * single AgentInstance is loaned to another building via a ProjectCall
 * (see context.ts) and sits in the corresponding office for its craft.
 */

import { DEFAULT_RANKS } from "./types";
import type {
  BuildingContext,
  Campus,
  DepartmentContext,
  Id,
  Project,
  Rank,
  Workspace,
  WorkspaceRole,
} from "./types";

export interface BuildProjectInput {
  id: Id;
  campusId: Id;
  name: string;
  /** Layout id for the map; defaults to a shared reference building. */
  buildingId?: string;
  context?: BuildingContext;
  ranks?: Rank[];
  campusLeadAgentId?: Id;
}

/** Create a new building (project). Transversal to its future rooms. */
export function buildProject(input: BuildProjectInput): Project {
  return {
    id: input.id,
    name: input.name,
    campusId: input.campusId,
    buildingId: input.buildingId ?? "reference-dual-room",
    workspaceIds: [],
    context: input.context ?? {},
    ranks: input.ranks ?? DEFAULT_RANKS,
    campusLeadAgentId: input.campusLeadAgentId,
    memoryWingId: input.id,
  };
}

export interface BuildWorkspaceInput {
  id: Id;
  projectId: Id;
  key: string;
  name: string;
  roomId?: string;
  themeColor?: string;
  role?: WorkspaceRole;
  context?: DepartmentContext;
  headAgentId?: Id;
}

/** Create a new room (department / workspace) inside a building. */
export function buildWorkspace(input: BuildWorkspaceInput): Workspace {
  return {
    id: input.id,
    projectId: input.projectId,
    key: input.key,
    name: input.name,
    roomId: input.roomId ?? `room-${input.key}`,
    themeColor: input.themeColor ?? "#3a4657",
    role: input.role ?? "custom",
    context: input.context ?? {},
    headAgentId: input.headAgentId,
  };
}

/** Attach a room to its building (keeps `workspaceIds` in sync). */
export function withWorkspace(project: Project, workspaceId: Id): Project {
  if (project.workspaceIds.includes(workspaceId)) return project;
  return { ...project, workspaceIds: [...project.workspaceIds, workspaceId] };
}

/** Convenience: build an empty campus shell. */
export function buildCampus(input: {
  id: Id;
  name: string;
  libraryId: Id;
  projectIds?: Id[];
}): Campus {
  return {
    id: input.id,
    name: input.name,
    libraryId: input.libraryId,
    projectIds: input.projectIds ?? [],
  };
}
