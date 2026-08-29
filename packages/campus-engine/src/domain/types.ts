/**
 * Campus Core — layer 1 domain types (control plane).
 *
 * Minimal hierarchy `Campus -> Building -> Room` plus the JSON-serializable
 * event contract and the read-only projection `State`. No agents, no commands,
 * no store/transport/clients (later layers).
 */

/** Opaque identifier provided by the caller (deterministic in tests). */
export type Id = string;

/** Root of the tree. */
export interface Campus {
  id: Id;
  name: string;
  buildingIds: Id[];
}

/** A building (= environment: Casa, Empresa A…) belongs to a campus. */
export interface Building {
  id: Id;
  campusId: Id;
  name: string;
  /** "Who we are" / environment norms (context for agents). */
  context?: string;
  /** The environment leader. Defaults to the auto-created leader agent. */
  leaderAgentId?: Id | null;
}

/** Room role/kind. The leader office is non-deletable. */
export type RoomRole = "leader" | "dept" | "utility" | "hallway";

/** A room (= workspace/office) belongs to a building. */
export interface Room {
  id: Id;
  buildingId: Id;
  key: string;
  /** Department head (an agent in this room). Assigned in layer 6. */
  headAgentId?: Id;
  /** Room role, e.g. "leader" (the leader office is non-deletable). */
  role?: RoomRole;
  /** Department norms/specialization (feeds the agent's effective context). */
  context?: string;
}

/** Rank key of the auto-created leader agent that heads a building (environment). */
export const LEADER_RANK_KEY = "leader";

/** Role marking the leader office room (created with the building; non-deletable). */
export const LEADER_ROOM_ROLE = "leader";

/**
 * A named agent instance, represented in a room of a building.
 * Role fields (rank/skill/supervisor) are optional and populated in layer 6+.
 */
export interface AgentInstance {
  id: Id;
  name: string;
  kind: "named" | "anonymous_worker";
  buildingId: Id;
  roomId: Id;
  /** Rank key (e.g. "ic", "lead", "head"). Optional until set. */
  rankKey?: string;
  /** Craft / oficio key (binds to library classifications later). */
  skillKey?: string;
  /** Direct supervisor in the org chart. */
  supervisorId?: Id | null;
  /** For anonymous workers: the named agent that spawned it. */
  spawnedById?: Id;
  /** Active inter-building loan (ProjectCall) if the agent is on loan. */
  activeCallId?: Id | null;
  /** Execution plane: the host running this agent, if alive. */
  hostId?: Id | null;
  /** Execution plane: the live runtime feeding this agent, if alive. */
  runtimeId?: Id | null;
}

/** A machine/process joined to the campus that can run agent runtimes. */
export interface AgentHost {
  id: Id;
  label: string;
  status: "online" | "offline";
}

/** A live runtime of one agent on a host (execution plane). */
export interface AgentRuntime {
  id: Id;
  hostId: Id;
  agentId: Id;
  status: "running" | "stopped";
  /** Host-local working dir the runtime may use (metadata only; core owns no bytes). */
  workingDir?: string;
}

/** Only agents of this rank may spawn/despawn anonymous workers (Constitución VI). */
export const WORKER_SPAWNER_RANK_KEY = "ic";

/**
 * Task lifecycle (Constitución VI, test-gate): "done" = 100% + green test, only
 * reachable via the direct supervisor's evaluation after review.
 */
export type TaskStatus =
  | "queued"
  | "running"
  | "under_review"
  | "succeeded"
  | "needs_revision";

export type TaskVerdict = "succeeded" | "needs_revision";

export interface Task {
  id: Id;
  title: string;
  assigneeId: Id;
  orderedById?: Id;
  status: TaskStatus;
  evaluatorId?: Id;
  verdict?: TaskVerdict;
}

/** A debate between same-rank peers (Constitución: debate solo mismo rango). */
export interface DebateSession {
  id: Id;
  participantIds: Id[];
  topic: string;
  status: "open" | "closed";
}

/** Spec-Driven Development phases per building (github/spec-kit). */
export type SpecKitPhase =
  | "constitution"
  | "specify"
  | "plan"
  | "tasks"
  | "implement"
  | "converge";

/** Ordered SDD phases. */
export const SPECKIT_PHASES: readonly SpecKitPhase[] = [
  "constitution",
  "specify",
  "plan",
  "tasks",
  "implement",
  "converge",
];

/** Per-building Spec Kit state. */
export interface BuildingSpecKit {
  buildingId: Id;
  phase: SpecKitPhase;
}

/** An SDD artifact produced within a building's Spec Kit. */
export interface SpecKitArtifact {
  id: Id;
  buildingId: Id;
  kind: string;
  title: string;
}

/** Kind of library material. */
export type DocKind = "code" | "law" | "manual" | "policy" | "research" | "other";

/**
 * A campus-scoped classification bound to crafts (skillKeys). Documents are
 * associated to agents by oficio, not by instance id.
 */
export interface DocClassification {
  id: Id;
  key: string;
  label: string;
  vectorNamespace: string;
  skillKeys: string[];
}

/** A library document classified by one or more classifications. */
export interface LibraryDocument {
  id: Id;
  title: string;
  kind: DocKind;
  classificationIds: Id[];
  sourceUri?: string;
}

/** Memory scope: an agent's private drawer, or a building's shared project wing. */
export type MemoryScope = "agent" | "project";

/**
 * A memory record (MemPalace drawer). `ownerId` is an agentId (scope "agent") or
 * a buildingId (scope "project"). The core stores pointers/records, not blobs.
 */
export interface MemoryRecord {
  id: Id;
  scope: MemoryScope;
  ownerId: Id;
  room: string;
  text: string;
}

/**
 * Inter-building loan. Moves an agent's *representation* (building/room), not its
 * execution (host). Origin is captured so the agent can return home on close.
 */
export interface ProjectCall {
  id: Id;
  agentId: Id;
  toBuildingId: Id;
  toRoomId: Id;
  originBuildingId: Id;
  originRoomId: Id;
  status: "open" | "closed";
}

/**
 * Facts emitted by the core, consumed by any client (JSON-serializable,
 * language-neutral). Named `entity.pastTense`.
 */
export type CampusEvent =
  | { type: "campus.loaded"; campus: Campus }
  | { type: "building.spawned"; building: Building; leaderRoom?: Room; leaderAgent?: AgentInstance }
  | { type: "building.context.updated"; buildingId: Id; context: string }
  | { type: "building.lead.assigned"; buildingId: Id; agentId: Id }
  | { type: "room.spawned"; room: Room }
  | { type: "room.context.updated"; roomId: Id; context: string }
  | { type: "agent.instantiated"; agent: AgentInstance }
  | { type: "agent.supervisor.assigned"; agentId: Id; supervisorId: Id | null }
  | { type: "room.head.assigned"; roomId: Id; agentId: Id }
  | { type: "worker.entered"; worker: AgentInstance }
  | { type: "worker.exited"; workerId: Id }
  | { type: "task.created"; task: Task }
  | { type: "task.started"; taskId: Id }
  | { type: "task.submitted"; taskId: Id }
  | { type: "task.evaluated"; taskId: Id; evaluatorId: Id; verdict: TaskVerdict }
  | { type: "debate.opened"; debate: DebateSession }
  | { type: "debate.closed"; debateId: Id }
  | { type: "project.call.issued"; call: ProjectCall }
  | { type: "project.call.closed"; callId: Id; agentId: Id }
  | { type: "memory.remembered"; record: MemoryRecord }
  | { type: "speckit.enabled"; buildingId: Id; phase: SpecKitPhase }
  | { type: "speckit.phase.changed"; buildingId: Id; phase: SpecKitPhase }
  | { type: "speckit.artifact.upserted"; artifact: SpecKitArtifact }
  | { type: "host.joined"; host: AgentHost }
  | { type: "host.left"; hostId: Id }
  | { type: "runtime.started"; runtime: AgentRuntime }
  | { type: "runtime.stopped"; runtimeId: Id }
  | { type: "library.classification.upserted"; classification: DocClassification }
  | { type: "library.document.upserted"; document: LibraryDocument };

/** Read-only projection reconstructed from the event log. */
export interface State {
  campus: Campus | null;
  buildings: Building[];
  rooms: Room[];
  agents: AgentInstance[];
  /** Anonymous workers currently in the campus (ephemeral). */
  workers: AgentInstance[];
  tasks: Task[];
  debates: DebateSession[];
  calls: ProjectCall[];
  memories: MemoryRecord[];
  specKits: BuildingSpecKit[];
  specArtifacts: SpecKitArtifact[];
  hosts: AgentHost[];
  runtimes: AgentRuntime[];
  classifications: DocClassification[];
  documents: LibraryDocument[];
}

/** Canonical empty projection. */
export const EMPTY_STATE: State = {
  campus: null,
  buildings: [],
  rooms: [],
  agents: [],
  workers: [],
  tasks: [],
  debates: [],
  calls: [],
  memories: [],
  specKits: [],
  specArtifacts: [],
  hosts: [],
  runtimes: [],
  classifications: [],
  documents: [],
};
