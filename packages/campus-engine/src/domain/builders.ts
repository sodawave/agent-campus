/**
 * Pure builders for the layer-1 entities. IDs are provided by the caller so
 * fixtures and tests stay deterministic. Same input -> structurally equal output.
 */

import type { AgentInstance, Building, Campus, Id, Room } from "./types";

export function buildCampus(input: {
  id: Id;
  name: string;
  buildingIds?: Id[];
}): Campus {
  return {
    id: input.id,
    name: input.name,
    buildingIds: input.buildingIds ? [...input.buildingIds] : [],
  };
}

export function buildBuilding(input: {
  id: Id;
  campusId: Id;
  name: string;
}): Building {
  return {
    id: input.id,
    campusId: input.campusId,
    name: input.name,
  };
}

export function buildRoom(input: {
  id: Id;
  buildingId: Id;
  key: string;
}): Room {
  return {
    id: input.id,
    buildingId: input.buildingId,
    key: input.key,
  };
}

export function buildAgent(input: {
  id: Id;
  name: string;
  buildingId: Id;
  roomId: Id;
  rankKey?: string;
  skillKey?: string;
  supervisorId?: Id | null;
}): AgentInstance {
  const agent: AgentInstance = {
    id: input.id,
    name: input.name,
    kind: "named",
    buildingId: input.buildingId,
    roomId: input.roomId,
  };
  // Include role fields only when provided (keeps earlier fixtures unchanged).
  if (input.rankKey !== undefined) agent.rankKey = input.rankKey;
  if (input.skillKey !== undefined) agent.skillKey = input.skillKey;
  if (input.supervisorId !== undefined) agent.supervisorId = input.supervisorId;
  return agent;
}

export function buildWorker(input: {
  id: Id;
  buildingId: Id;
  roomId: Id;
  spawnedById: Id;
  name?: string;
}): AgentInstance {
  return {
    id: input.id,
    name: input.name ?? "Worker",
    kind: "anonymous_worker",
    buildingId: input.buildingId,
    roomId: input.roomId,
    rankKey: "ic",
    spawnedById: input.spawnedById,
  };
}
