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

/** A building (= project) belongs to a campus. */
export interface Building {
  id: Id;
  campusId: Id;
  name: string;
}

/** A room (= workspace/office) belongs to a building. */
export interface Room {
  id: Id;
  buildingId: Id;
  key: string;
  /** Department head (an agent in this room). Assigned in layer 6. */
  headAgentId?: Id;
}

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

/**
 * Facts emitted by the core, consumed by any client (JSON-serializable,
 * language-neutral). Named `entity.pastTense`.
 */
export type CampusEvent =
  | { type: "campus.loaded"; campus: Campus }
  | { type: "building.spawned"; building: Building }
  | { type: "room.spawned"; room: Room }
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
  | { type: "debate.closed"; debateId: Id };

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
};
