/**
 * Domain types for Agent Campus engine (v0.11).
 * Pure TS — no Phaser imports.
 *
 * Clients: web + native iOS/Android sharing this domain over API/WS.
 * Memory: MemPalace at agent + project scope.
 * Specs: Spec Kit SDD per project.
 */

export type Id = string;

export type WorkspaceRole =
  | "briefing"
  | "ops"
  | "utility"
  | "hallway"
  | "library"
  | "custom";

/** Kinds of material stored in the campus library. */
export type DocKind =
  | "code"
  | "law"
  | "manual"
  | "policy"
  | "research"
  | "other";

/** Visual mood frame key — semantics TBD by product. */
export type Mood =
  | "neutral"
  | "blush"
  | "hearts"
  | "focus"
  | "blocked"
  | "error";

export type RunStatus =
  | "queued"
  | "running"
  | "waiting_human"
  | "succeeded"
  | "failed"
  | "under_review";

export type EvaluationVerdict =
  | "approved"
  | "rejected"
  | "needs_revision"
  | "escalated";

/** Generic craft knowledge on the archetype (oficio). */
export interface Skill {
  id: Id;
  key: string;
  label: string;
  level?: string;
  summary?: string;
}

/**
 * LLM / harness knobs — settable per instance (defaults from archetype).
 * "effort" is product-level (tokens/thinking budget), not a Phaser concept.
 */
export interface HarnessParams {
  /** Model id, e.g. "gpt-5", "claude-sonnet", "gemini-…" */
  model: string;
  /** Sampling temperature. */
  temperature: number;
  /**
   * Effort / thinking budget knob (0..1 or vendor-specific scale).
   * Exact semantics left to the harness adapter.
   */
  effort: number;
  /** Optional caps. */
  maxTokens?: number;
}

export const DEFAULT_HARNESS_PARAMS: HarnessParams = {
  model: "default",
  temperature: 0.3,
  effort: 0.5,
};

/**
 * Rank in the campus org chart.
 * Higher `level` = higher in hierarchy (IC < lead < head < director…).
 * Same `level` ⇒ peers (can debate).
 */
export interface Rank {
  id: Id;
  /** Stable key: "ic" | "senior" | "lead" | "head" | "director" | "campus_lead" */
  key: string;
  label: string;
  /** Numeric order; compare with === for peers, < / > for reporting lines. */
  level: number;
}

/** Default campus rank ladder (override per project if needed).
 * "Último rango" = lowest `level` (ic) — may spawn/destroy anonymous workers.
 */
export const DEFAULT_RANKS: Rank[] = [
  { id: "rank-ic", key: "ic", label: "Individual contributor", level: 1 },
  { id: "rank-senior", key: "senior", label: "Senior", level: 2 },
  { id: "rank-lead", key: "lead", label: "Lead", level: 3 },
  { id: "rank-head", key: "head", label: "Jefe de departamento", level: 4 },
  { id: "rank-director", key: "director", label: "Director", level: 5 },
  { id: "rank-campus", key: "campus_lead", label: "Campus lead", level: 6 },
];

/** Rank key allowed to instantiate/destroy ephemeral workers. */
export const WORKER_SPAWNER_RANK_KEY = "ic";

/** Three primary app surfaces (all clients). */
export type AppScreen = "gamification" | "org_tasks" | "chats";

/** Delivery targets — same domain, different shells. */
export type ClientPlatform =
  | "web"
  | "ios"
  | "android"
  | "desktop"
  | "godot"
  | "cli_host";

export type AgentKind = "named" | "anonymous_worker";
/**
 * Project / building-level context — “quiénes somos”.
 */
export interface BuildingContext {
  mission?: string;
  product?: string;
  audience?: string;
  brand?: string;
  brief?: string;
  metadata?: Record<string, string>;
}

/**
 * Department / room specialization.
 */
export interface DepartmentContext {
  title?: string;
  specialization?: string;
  styleGuide?: string;
  tools?: string[];
  brief?: string;
  metadata?: Record<string, string>;
}

/**
 * Campus = org campus that may contain several buildings (projects)
 * and a shared Library.
 */
export interface Campus {
  id: Id;
  name: string;
  libraryId: Id;
  projectIds: Id[];
  /**
   * MemPalace palace ref for this campus (local path or hub id).
   * @see https://github.com/MemPalace/mempalace
   */
  memoryPalaceRef?: string;
}

/** MemPalace-aligned address for an agent's memory scope. */
export interface MemoryAddress {
  palaceId: Id;
  wingId: Id;
  roomId: string;
}

export type MemoryBackendKind = "mempalace" | "custom";

export interface MemoryConfig {
  backend: MemoryBackendKind;
  palaceRef: string;
  verbatimOnly?: boolean;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  backend: "mempalace",
  palaceRef: "~/.mempalace/agent-campus",
  verbatimOnly: true,
};

export type MemoryEntryKind =
  | "chat"
  | "task"
  | "decision"
  | "observation"
  | "handoff"
  | "other";

/** One MemPalace drawer — stored verbatim. */
export interface MemoryDrawer {
  id: Id;
  address: MemoryAddress;
  kind: MemoryEntryKind;
  content: string;
  agentId: Id;
  projectId: Id;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface MemoryQuery {
  agentId: Id;
  text: string;
  wingId?: Id;
  roomId?: string;
  topK?: number;
}

export interface MemoryHit {
  drawer: MemoryDrawer;
  score: number;
}

/** Spec Kit SDD phases — https://github.com/github/spec-kit */
export type SpecKitPhase =
  | "constitution"
  | "specify"
  | "plan"
  | "tasks"
  | "implement"
  | "converge";

export type SpecKitExtension = "bug" | "assess";

export type SpecKitArtifactKind =
  | "constitution"
  | "spec"
  | "plan"
  | "tasks"
  | "convergence_report"
  | "bug_assessment"
  | "bug_fix"
  | "bug_test"
  | "idea_intake"
  | "idea_research"
  | "idea_define"
  | "idea_shape"
  | "idea_decide";

export type SpecKitConvergenceStatus =
  | "diverged"
  | "in_progress"
  | "converged";

/** Spec-Driven Development binding on a project/building. */
export interface ProjectSpecKit {
  enabled: boolean;
  integration?: string;
  phase: SpecKitPhase;
  extensions: SpecKitExtension[];
  specRoot?: string;
  convergence: SpecKitConvergenceStatus;
  toolkitVersion?: string;
}

export const DEFAULT_PROJECT_SPEC_KIT: ProjectSpecKit = {
  enabled: true,
  phase: "constitution",
  extensions: [],
  convergence: "diverged",
  toolkitVersion: "v1.0.0",
};

export interface SpecKitArtifact {
  id: Id;
  projectId: Id;
  kind: SpecKitArtifactKind;
  title: string;
  slug?: string;
  uri: string;
  status: "draft" | "active" | "archived";
  updatedAt: string;
  authorAgentId?: Id;
}

/**
 * Campus library — indexes documentation (code, law books, manuals, …).
 * Physically may map to a room with role "library"; logically campus-scoped.
 */
export interface Library {
  id: Id;
  campusId: Id;
  name: string;
  /** Optional spatial room id in a building layout. */
  roomId?: string;
}

/**
 * Taxonomic classification of library material.
 * Drives vector categorization (one namespace / collection per classification).
 * Bound to oficio via `skillKeys` — same craft in different buildings shares it.
 */
export interface DocClassification {
  id: Id;
  libraryId: Id;
  key: string;
  label: string;
  /** Embedding / vector store namespace or collection id. */
  vectorNamespace: string;
  embeddingModel?: string;
  /**
   * Oficio keys (`Skill.key`) that may retrieve this category.
   * Cross-building: any instance with matching skill.key gets access.
   */
  skillKeys: string[];
  description?: string;
}

/** A single indexed document in the library. */
export interface LibraryDocument {
  id: Id;
  libraryId: Id;
  title: string;
  kind: DocKind;
  sourceUri?: string;
  /** Classifications this doc belongs to (→ vector categories). */
  classificationIds: Id[];
  /** Optional building scope; omit = campus-wide. */
  projectId?: Id;
  metadata?: Record<string, string>;
  indexedAt?: string;
}

export interface AgentArchetype {
  id: Id;
  title: string;
  skill: Skill;
  spriteKey: string;
  naturalDepartmentKey: string;
  /** Default rank when instantiated (e.g. "ic", "senior"). */
  defaultRankKey: string;
  /** Default harness knobs; overridable on the instance. */
  defaultHarness: HarnessParams;
  defaultRole?: string;
  tags?: string[];
  description?: string;
}

export interface Project {
  id: Id;
  name: string;
  /** Campus this building belongs to (shared library + palace). */
  campusId: Id;
  buildingId: string;
  workspaceIds: Id[];
  context: BuildingContext;
  ranks: Rank[];
  campusLeadAgentId?: Id;
  /**
   * MemPalace wing id for **project-level** shared memory.
   * Defaults to `project.id` when omitted.
   */
  memoryWingId?: Id;
  /**
   * Spec-Driven Development binding ([Spec Kit](https://github.com/github/spec-kit)).
   */
  specKit?: ProjectSpecKit;
}

/** Room = department. */
export interface Workspace {
  id: Id;
  projectId: Id;
  key: string;
  name: string;
  roomId: string;
  themeColor: string;
  role: WorkspaceRole;
  context: DepartmentContext;
  /** Jefe de departamento — must outrank members; usually rank key "head". */
  headAgentId?: Id;
}

/**
 * Resolved stack for the harness.
 *
 * Always reasons as oficio (craft). Building context = CURRENT building.
 * Department = corresponding office in the current building
 * (workspace.key === naturalDepartmentKey), not a random room being visited.
 */
export interface AgentEffectiveContext {
  craft: Skill;
  building: BuildingContext;
  /** Corresponding office in the current building; null if that dpto doesn't exist there. */
  department: DepartmentContext | null;
  homeProjectId: Id;
  homeWorkspaceId: Id | null;
  currentProjectId: Id;
  /** Positional room — may differ from corresponding office while wandering. */
  currentWorkspaceId: Id | null;
  harness: HarnessParams;
  rank: Rank;
  supervisorId: Id | null;
  libraryClassifications: DocClassification[];
  /** Agent-scoped MemPalace address (default wing=home project). */
  memoryAddress: MemoryAddress;
  /** Shared project-wing address for building-level memory. */
  projectMemoryAddress: MemoryAddress;
  /** Active Spec Kit phase if SDD enabled on the current project. */
  specKitPhase?: SpecKitPhase;
}

export interface AgentInstance {
  id: Id;
  archetypeId: Id;
  /** "named" from catalog vs ephemeral anonymous worker. */
  kind: AgentKind;
  /** Building where the agent was hired / primarily belongs. */
  homeProjectId: Id;
  /** Building the sprite is in right now (home, or destination of an active call). */
  projectId: Id;
  workspaceId: Id | null;
  /**
   * Corresponding office in home building (naturalDepartmentKey there).
   * Named agents normally stay here; they leave only when called by another project.
   */
  homeWorkspaceId: Id | null;
  /**
   * Active inter-project summons, if any.
   * Null ⇒ agent should be in home office (default behaviour).
   */
  activeCallId: Id | null;
  /**
   * Spawner of an anonymous worker (must be último rango / ic).
   * Null for named catalog instances.
   */
  spawnedById: Id | null;
  /** Display name; anonymous workers use a generic label (e.g. "Worker"). */
  name: string;
  spriteKey: string;
  skill: Skill;
  naturalDepartmentKey: string;
  rankKey: string;
  supervisorId: Id | null;
  harness: HarnessParams;
  role: string;
  mood: Mood;
  runId: Id | null;
  anchorId?: string;
  introducing?: boolean;
  /**
   * Host machine currently running this agent's live process.
   * Null = catalog-only / suspended (not represented as "alive" on map).
   */
  hostId?: Id | null;
  /** Active runtime id on that host (CLI process). */
  runtimeId?: Id | null;
}

/**
 * Call from another project that authorizes leaving the home office.
 * Without an active call, agents do not roam between buildings.
 */
export interface ProjectCall {
  id: Id;
  /** Project that requests the agent. */
  fromProjectId: Id;
  /** Agent's home project. */
  homeProjectId: Id;
  agentId: Id;
  reason?: string;
  taskId?: Id;
  status: "pending" | "accepted" | "active" | "completed" | "cancelled";
  createdAt: string;
}

export type Agent = AgentInstance;

export interface Run {
  id: Id;
  agentId: Id;
  workspaceId: Id;
  label: string;
  progress: number;
  status: RunStatus;
  /** Set when submitted for supervisor review. */
  reviewerId?: Id;
}

/**
 * Task inventory entry — what the ops UI shows per agent.
 * A Run is the execution; Task is the unit in the agent's "inventario".
 */
export interface AgentTask {
  id: Id;
  agentId: Id;
  title: string;
  status: RunStatus;
  runId?: Id;
  orderedById?: Id;
  createdAt: string;
}

/**
 * Human (or supervisor agent) order issued to an instance.
 * Enforced by org rules before the harness accepts it.
 */
export interface AgentOrder {
  id: Id;
  toAgentId: Id;
  fromActorId: Id;
  /** "human" | agent id acting as supervisor */
  fromKind: "human" | "agent";
  instruction: string;
  taskId?: Id;
  status: "pending" | "accepted" | "rejected" | "done";
  createdAt: string;
}

/** Peer debate — only allowed when ranks are equal (see org.ts). */
export interface DebateSession {
  id: Id;
  projectId: Id;
  workspaceId: Id | null;
  participantIds: Id[];
  topic: string;
  status: "open" | "closed";
  createdAt: string;
}

export interface TaskEvaluation {
  id: Id;
  runId: Id;
  /** Must be the assignee's supervisor (or transitively authorized). */
  evaluatorId: Id;
  assigneeId: Id;
  verdict: EvaluationVerdict;
  score?: number;
  feedback?: string;
  createdAt: string;
}

export interface InstantiateIntent {
  projectId: Id;
  workspaceId?: Id;
}

export interface InstantiateRequest {
  projectId: Id;
  archetypeId: Id;
  name: string;
  workspaceId?: Id;
  anchorId?: string;
  stayInRoom?: boolean;
  /** Override archetype defaults. */
  rankKey?: string;
  supervisorId?: Id;
  harness?: Partial<HarnessParams>;
}

export type CampusEvent =
  | {
      type: "project.loaded";
      project: Project;
      workspaces: Workspace[];
      catalog: AgentArchetype[];
      agents: AgentInstance[];
      runs: Run[];
    }
  | { type: "catalog.loaded"; catalog: AgentArchetype[] }
  | {
      type: "agent.instantiate.requested";
      request: InstantiateRequest;
    }
  | {
      type: "agent.instantiated";
      agent: AgentInstance;
      peerIds: Id[];
    }
  | {
      type: "agent.introduction.started";
      agentId: Id;
      peerIds: Id[];
    }
  | {
      type: "agent.introduction.completed";
      agentId: Id;
    }
  | {
      type: "agent.homing";
      agentId: Id;
      homeWorkspaceId: Id;
    }
  | {
      type: "project.call.issued";
      call: ProjectCall;
    }
  | {
      type: "project.call.accepted";
      callId: Id;
      agentId: Id;
    }
  | {
      /** Agent left home office because another project called them. */
      type: "agent.building.entered";
      agentId: Id;
      projectId: Id;
      workspaceId: Id | null;
      callId: Id;
      correspondingOfficeFound: boolean;
    }
  | {
      /** Call finished — agent returns to home office. */
      type: "agent.returned_home";
      agentId: Id;
      homeProjectId: Id;
      homeWorkspaceId: Id | null;
      callId: Id;
    }
  | {
      type: "agent.harness.updated";
      agentId: Id;
      harness: HarnessParams;
    }
  | {
      type: "agent.rank.updated";
      agentId: Id;
      rankKey: string;
      supervisorId: Id | null;
    }
  | {
      type: "org.head.assigned";
      workspaceId: Id;
      headAgentId: Id;
    }
  | {
      type: "debate.requested";
      initiatorId: Id;
      peerIds: Id[];
      topic: string;
    }
  | {
      type: "debate.started";
      debate: DebateSession;
    }
  | {
      type: "debate.rejected";
      reason: "rank_mismatch" | "hierarchy_skip" | "not_peers" | "other";
      initiatorId: Id;
      peerIds: Id[];
    }
  | {
      type: "debate.closed";
      debateId: Id;
    }
  | {
      type: "task.submitted_for_review";
      runId: Id;
      assigneeId: Id;
      reviewerId: Id;
    }
  | {
      type: "task.evaluated";
      evaluation: TaskEvaluation;
    }
  | {
      type: "hierarchy.violation";
      fromAgentId: Id;
      toAgentId: Id;
      action: "message" | "debate" | "evaluate" | "assign";
      reason: string;
    }
  | {
      type: "task.inventory.updated";
      agentId: Id;
      tasks: AgentTask[];
    }
  | {
      type: "order.issued";
      order: AgentOrder;
    }
  | {
      type: "order.updated";
      order: AgentOrder;
    }
  | {
      /** Anonymous worker enters campus (spawn). Map: gate/entrance animation. */
      type: "worker.entered";
      worker: AgentInstance;
      spawnedById: Id;
    }
  | {
      /** Anonymous worker leaves campus (destroy). Map: exit animation. */
      type: "worker.exited";
      workerId: Id;
      spawnedById: Id;
    }
  | {
      type: "worker.spawn.rejected";
      actorId: Id;
      reason: "rank_not_allowed" | "other";
    }
  | {
      type: "memory.remembered";
      drawer: MemoryDrawer;
    }
  | {
      type: "memory.recalled";
      agentId: Id;
      query: string;
      hitIds: Id[];
    }
  | {
      type: "memory.project.remembered";
      projectId: Id;
      drawer: MemoryDrawer;
    }
  | {
      type: "speckit.phase.changed";
      projectId: Id;
      phase: SpecKitPhase;
      convergence: SpecKitConvergenceStatus;
    }
  | {
      type: "speckit.artifact.upserted";
      artifact: SpecKitArtifact;
    }
  | {
      type: "host.joined";
      host: import("./host").AgentHost;
    }
  | {
      type: "host.left";
      hostId: Id;
    }
  | {
      type: "host.heartbeat";
      hostId: Id;
      at: string;
    }
  | {
      /** Runtime started on a host — map should place/keep agent in office. */
      type: "runtime.started";
      runtime: import("./host").AgentRuntime;
    }
  | {
      type: "runtime.stopped";
      runtimeId: Id;
      agentId: Id;
      hostId: Id;
    }
  | {
      type: "library.loaded";
      library: Library;
      classifications: DocClassification[];
      documents: LibraryDocument[];
    }
  | {
      type: "library.document.upserted";
      document: LibraryDocument;
    }
  | {
      type: "library.document.removed";
      documentId: Id;
    }
  | {
      type: "library.classification.upserted";
      classification: DocClassification;
    }
  | {
      type: "library.reindexed";
      classificationId: Id;
      vectorNamespace: string;
    }
  | { type: "agent.despawned"; agentId: Id }
  | {
      type: "agent.moved";
      agentId: Id;
      workspaceId: Id | null;
      anchorId?: string;
    }
  | { type: "agent.mood"; agentId: Id; mood: Mood }
  | {
      type: "building.context.updated";
      projectId: Id;
      context: BuildingContext;
    }
  | {
      type: "department.context.updated";
      workspaceId: Id;
      context: DepartmentContext;
    }
  | { type: "run.upserted"; run: Run }
  | { type: "run.removed"; runId: Id };
