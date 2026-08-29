/**
 * Pure builders for the layer-1 entities. IDs are provided by the caller so
 * fixtures and tests stay deterministic. Same input -> structurally equal output.
 */

import type { AgentHost, AgentInstance, AgentRuntime, Building, Campus, DebateSession, DocClassification, DocKind, Id, LibraryDocument, MemoryRecord, MemoryScope, Room, RoomRole, SpecKitArtifact, Task } from "./types";

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
  role?: RoomRole;
  context?: string;
}): Room {
  const room: Room = {
    id: input.id,
    buildingId: input.buildingId,
    key: input.key,
  };
  if (input.role !== undefined) room.role = input.role;
  if (input.context !== undefined) room.context = input.context;
  return room;
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

export function buildTask(input: {
  id: Id;
  title: string;
  assigneeId: Id;
  orderedById?: Id;
}): Task {
  const task: Task = {
    id: input.id,
    title: input.title,
    assigneeId: input.assigneeId,
    status: "queued",
  };
  if (input.orderedById !== undefined) task.orderedById = input.orderedById;
  return task;
}

export function buildDebate(input: {
  id: Id;
  participantIds: Id[];
  topic: string;
}): DebateSession {
  return {
    id: input.id,
    participantIds: [...input.participantIds],
    topic: input.topic,
    status: "open",
  };
}

export function buildMemory(input: {
  id: Id;
  scope: MemoryScope;
  ownerId: Id;
  text: string;
  room?: string;
}): MemoryRecord {
  return {
    id: input.id,
    scope: input.scope,
    ownerId: input.ownerId,
    room: input.room ?? "_general",
    text: input.text,
  };
}

export function buildSpecKitArtifact(input: {
  id: Id;
  buildingId: Id;
  kind: string;
  title: string;
}): SpecKitArtifact {
  return {
    id: input.id,
    buildingId: input.buildingId,
    kind: input.kind,
    title: input.title,
  };
}

export function buildClassification(input: {
  id: Id;
  key: string;
  label: string;
  vectorNamespace?: string;
  skillKeys: string[];
}): DocClassification {
  return {
    id: input.id,
    key: input.key,
    label: input.label,
    vectorNamespace: input.vectorNamespace ?? input.key,
    skillKeys: [...input.skillKeys],
  };
}

export function buildDocument(input: {
  id: Id;
  title: string;
  kind: DocKind;
  classificationIds: Id[];
  sourceUri?: string;
}): LibraryDocument {
  const doc: LibraryDocument = {
    id: input.id,
    title: input.title,
    kind: input.kind,
    classificationIds: [...input.classificationIds],
  };
  if (input.sourceUri !== undefined) doc.sourceUri = input.sourceUri;
  return doc;
}

export function buildHost(input: { id: Id; label: string }): AgentHost {
  return { id: input.id, label: input.label, status: "online" };
}

export function buildRuntime(input: {
  id: Id;
  hostId: Id;
  agentId: Id;
  workingDir?: string;
}): AgentRuntime {
  const runtime: AgentRuntime = {
    id: input.id,
    hostId: input.hostId,
    agentId: input.agentId,
    status: "running",
  };
  if (input.workingDir !== undefined) runtime.workingDir = input.workingDir;
  return runtime;
}
