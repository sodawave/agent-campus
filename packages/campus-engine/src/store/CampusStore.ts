/**
 * CampusStore — campus-scoped projection + command facade.
 *
 * The store is organized as an **entity-namespaced command facade**
 * (`campus.*`, `building.*`, `room.*`, `agent.*`, `worker.*`). Each action
 * builds a {@link CampusEvent} with the pure domain functions and dispatches it;
 * the pure {@link reduce} applies events to state. Business rules live in the
 * domain, never in the UI (TECH_SPEC §4).
 *
 * Campus-scoped: the campus holds several **buildings** (projects), each
 * transversal to its **rooms** (departments/oficios). Agents are single
 * instances — to work for another building they are loaned via a ProjectCall
 * (`agent.callToBuilding` / `agent.returnHome`), never cloned.
 */

import {
  acceptProjectCall,
  buildAgentInstance,
  issueProjectCall,
  returnHomeFromCall,
} from "../domain/context";
import { buildProject, buildWorkspace, withWorkspace } from "../domain/campus";
import {
  createTask,
  issueOrder as buildOrder,
  orderCreatesTask,
  tasksForAgent,
} from "../domain/tasks";
import { canDestroyWorker, spawnAnonymousWorker } from "../domain/workers";
import {
  createSpecKitArtifact,
  initProjectSpecKit,
  nextSpecKitPhase,
} from "../domain/speckit";
import { buildAgentHost, buildAgentRuntime } from "../domain/host";
import type { AgentHost, AgentRuntime } from "../domain/host";
import type {
  AgentArchetype,
  AgentInstance,
  AgentOrder,
  AgentTask,
  BuildingContext,
  Campus,
  CampusEvent,
  DepartmentContext,
  DocClassification,
  HarnessParams,
  Id,
  InstantiateRequest,
  Library,
  LibraryDocument,
  Project,
  ProjectCall,
  ProjectSpecKit,
  Run,
  RunStatus,
  Skill,
  SpecKitArtifact,
  SpecKitArtifactKind,
  SpecKitConvergenceStatus,
  SpecKitPhase,
  Workspace,
  WorkspaceRole,
} from "../domain/types";

export interface CampusState {
  campus: Campus | null;
  /** All buildings (projects) active on the campus. */
  buildings: Project[];
  /** All rooms (workspaces) across every building; each has `projectId`. */
  workspaces: Workspace[];
  catalog: AgentArchetype[];
  library: Library | null;
  classifications: DocClassification[];
  documents: LibraryDocument[];
  agents: AgentInstance[];
  runs: Run[];
  orders: AgentOrder[];
  tasks: AgentTask[];
  /** Inter-building loans (ProjectCall) in flight. */
  calls: ProjectCall[];
  /** Spec Kit (SDD) artifacts, per building (`projectId`). */
  specArtifacts: SpecKitArtifact[];
  /** Execution plane: machines that run agent runtimes. */
  hosts: AgentHost[];
  /** Execution plane: live runtimes (one per alive agent). */
  runtimes: AgentRuntime[];
}

export interface LoadCampusInput {
  campus?: Campus | null;
  /** Initial building to load. */
  project: Project;
  workspaces: Workspace[];
  catalog: AgentArchetype[];
  library?: Library | null;
  classifications?: DocClassification[];
  documents?: LibraryDocument[];
  agents?: AgentInstance[];
  runs?: Run[];
}

export interface SpawnBuildingInput {
  name: string;
  buildingId?: string;
  context?: BuildingContext;
}

export interface SpawnRoomInput {
  buildingId: Id;
  key: string;
  name: string;
  roomId?: string;
  themeColor?: string;
  role?: WorkspaceRole;
  context?: DepartmentContext;
}

type Listener = (state: CampusState, event: CampusEvent | null) => void;

export type SpawnWorkerResult =
  | { ok: true; worker: AgentInstance }
  | { ok: false; reason: "rank_not_allowed" | "unknown_actor" };

export type DestroyWorkerResult =
  | { ok: true; workerId: Id }
  | { ok: false; reason: "not_allowed" | "unknown" };

export type CallResult =
  | { ok: true; call: ProjectCall }
  | { ok: false; reason: "unknown_agent" | "unknown_building" | "same_as_home" };

export type ReturnHomeResult =
  | { ok: true; agentId: Id }
  | { ok: false; reason: "unknown_agent" | "not_on_call" };

export type SpawnRuntimeResult =
  | { ok: true; runtime: AgentRuntime }
  | {
      ok: false;
      reason: "unknown_host" | "unknown_agent" | "host_offline" | "already_running";
    };

export type StopRuntimeResult =
  | { ok: true; runtimeId: Id }
  | { ok: false; reason: "unknown_runtime" };

export interface HostJoinInput {
  label: string;
  campusUrl?: string;
  machineId?: string;
  allowedRankKeys?: string[];
  allowedSkillKeys?: string[];
  version?: string;
  token?: string;
}

let idCounter = 0;
function nextId(prefix: string): Id {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

const EMPTY_STATE: CampusState = {
  campus: null,
  buildings: [],
  workspaces: [],
  catalog: [],
  library: null,
  classifications: [],
  documents: [],
  agents: [],
  runs: [],
  orders: [],
  tasks: [],
  calls: [],
  specArtifacts: [],
  hosts: [],
  runtimes: [],
};

export class CampusStore {
  private state: CampusState = EMPTY_STATE;
  private readonly listeners = new Set<Listener>();
  private readonly log: CampusEvent[] = [];

  // ---- Reads ----

  getState(): CampusState {
    return this.state;
  }

  getEventLog(): readonly CampusEvent[] {
    return this.log;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getAgent(id: Id): AgentInstance | undefined {
    return this.state.agents.find((a) => a.id === id);
  }

  getBuilding(id: Id): Project | undefined {
    return this.state.buildings.find((b) => b.id === id);
  }

  firstBuilding(): Project | undefined {
    return this.state.buildings[0];
  }

  workspacesOf(buildingId: Id): Workspace[] {
    return this.state.workspaces.filter((w) => w.projectId === buildingId);
  }

  namedAgents(): AgentInstance[] {
    return this.state.agents.filter((a) => a.kind === "named");
  }

  workers(): AgentInstance[] {
    return this.state.agents.filter((a) => a.kind === "anonymous_worker");
  }

  agentsInWorkspace(workspaceId: Id): AgentInstance[] {
    return this.state.agents.filter((a) => a.workspaceId === workspaceId);
  }

  /** Agents currently physically present in a building (home or on loan). */
  agentsInBuilding(buildingId: Id): AgentInstance[] {
    return this.state.agents.filter((a) => a.projectId === buildingId);
  }

  /** Agents currently away from their home building on an active call. */
  agentsAwayFromHome(): AgentInstance[] {
    return this.state.agents.filter(
      (a) => a.activeCallId !== null && a.projectId !== a.homeProjectId,
    );
  }

  tasksForAgent(agentId: Id): AgentTask[] {
    return tasksForAgent(this.state.tasks, agentId);
  }

  /** Spec Kit (SDD) binding for a building, if enabled. */
  specKitOf(buildingId: Id): ProjectSpecKit | undefined {
    return this.getBuilding(buildingId)?.specKit;
  }

  /** Spec Kit artifacts belonging to a building. */
  specArtifactsOf(buildingId: Id): SpecKitArtifact[] {
    return this.state.specArtifacts.filter((a) => a.projectId === buildingId);
  }

  // ---- Execution plane (hosts / runtimes) ----

  hosts(): AgentHost[] {
    return this.state.hosts;
  }

  getHost(id: Id): AgentHost | undefined {
    return this.state.hosts.find((h) => h.id === id);
  }

  runtimes(): AgentRuntime[] {
    return this.state.runtimes;
  }

  runtimesOf(hostId: Id): AgentRuntime[] {
    return this.state.runtimes.filter((r) => r.hostId === hostId);
  }

  /** Agents that are currently "alive" (bound to a runtime on a host). */
  liveAgents(): AgentInstance[] {
    return this.state.agents.filter((a) => a.runtimeId != null);
  }

  isAlive(agentId: Id): boolean {
    return this.getAgent(agentId)?.runtimeId != null;
  }

  // ---- Event plumbing ----

  /** Apply an event to the state (idempotent) and notify listeners. */
  dispatch(event: CampusEvent): void {
    this.log.push(event);
    this.state = reduce(this.state, event);
    this.emit(event);
  }

  private emit(event: CampusEvent | null): void {
    for (const listener of this.listeners) listener(this.state, event);
  }

  // ---- Entity-namespaced command facade ----

  readonly campus = {
    load: (input: LoadCampusInput): void => this.loadCampus(input),
  };

  readonly building = {
    spawn: (input: SpawnBuildingInput): Project => this.spawnBuilding(input),
    updateContext: (buildingId: Id, context: BuildingContext): void =>
      this.dispatch({
        type: "building.context.updated",
        projectId: buildingId,
        context,
      }),
    /** Spec-Driven Development (Spec Kit) — per building. */
    specKit: {
      enable: (buildingId: Id, overrides?: Partial<ProjectSpecKit>): void =>
        this.enableSpecKit(buildingId, overrides),
      advancePhase: (buildingId: Id): void =>
        this.advanceSpecKitPhase(buildingId),
      setPhase: (
        buildingId: Id,
        phase: SpecKitPhase,
        convergence?: SpecKitConvergenceStatus,
      ): void => this.setSpecKitPhase(buildingId, phase, convergence),
      addArtifact: (input: AddSpecArtifactInput): SpecKitArtifact =>
        this.addSpecArtifact(input),
    },
  };

  readonly room = {
    spawn: (input: SpawnRoomInput): Workspace => this.spawnRoom(input),
    assignHead: (workspaceId: Id, headAgentId: Id): void =>
      this.dispatch({ type: "org.head.assigned", workspaceId, headAgentId }),
    updateContext: (workspaceId: Id, context: DepartmentContext): void =>
      this.dispatch({
        type: "department.context.updated",
        workspaceId,
        context,
      }),
  };

  readonly agent = {
    spawn: (request: InstantiateRequest): AgentInstance =>
      this.instantiateAgent(request),
    introduce: (agentId: Id): void =>
      this.dispatch({ type: "agent.introduction.completed", agentId }),
    setHarness: (agentId: Id, harness: HarnessParams): void =>
      this.dispatch({ type: "agent.harness.updated", agentId, harness }),
    order: (input: OrderInput): AgentOrder => this.issueOrder(input),
    addTask: (input: AddTaskInput): AgentTask => this.addTask(input),
    /** Loan the agent to another building for its craft (ProjectCall). */
    callToBuilding: (input: {
      agentId: Id;
      toBuildingId: Id;
      reason?: string;
    }): CallResult => this.callAgentToBuilding(input),
    returnHome: (agentId: Id): ReturnHomeResult =>
      this.returnAgentHome(agentId),
  };

  readonly worker = {
    spawn: (input: {
      actorId: Id;
      skill?: Skill;
      label?: string;
      spriteKey?: string;
    }): SpawnWorkerResult => this.spawnWorker(input),
    despawn: (input: { actorId: Id; workerId: Id }): DestroyWorkerResult =>
      this.destroyWorker(input),
  };

  /** Execution plane: machines that keep agents alive (host/CLI). */
  readonly host = {
    join: (input: HostJoinInput): AgentHost => this.hostJoin(input),
    heartbeat: (hostId: Id): void =>
      this.dispatch({
        type: "host.heartbeat",
        hostId,
        at: new Date().toISOString(),
      }),
    leave: (hostId: Id): void => this.dispatch({ type: "host.left", hostId }),
    spawnRuntime: (input: {
      hostId: Id;
      agentId: Id;
      workingDir?: string;
    }): SpawnRuntimeResult => this.spawnRuntime(input),
    stopRuntime: (runtimeId: Id): StopRuntimeResult =>
      this.stopRuntime(runtimeId),
  };

  // ---- Command implementations ----

  private loadCampus(input: LoadCampusInput): void {
    if (input.campus) {
      this.dispatch({ type: "campus.loaded", campus: input.campus });
    }
    this.dispatch({
      type: "project.loaded",
      project: input.project,
      workspaces: input.workspaces,
      catalog: input.catalog,
      agents: input.agents ?? [],
      runs: input.runs ?? [],
    });
    if (input.library) {
      this.dispatch({
        type: "library.loaded",
        library: input.library,
        classifications: input.classifications ?? [],
        documents: input.documents ?? [],
      });
    }
  }

  private spawnBuilding(input: SpawnBuildingInput): Project {
    const project = buildProject({
      id: nextId("building"),
      campusId: this.state.campus?.id ?? "campus",
      name: input.name,
      buildingId: input.buildingId,
      context: input.context,
    });
    this.dispatch({ type: "building.spawned", project });
    return project;
  }

  private spawnRoom(input: SpawnRoomInput): Workspace {
    const workspace = buildWorkspace({
      id: nextId("room"),
      projectId: input.buildingId,
      key: input.key,
      name: input.name,
      roomId: input.roomId,
      themeColor: input.themeColor,
      role: input.role,
      context: input.context,
    });
    this.dispatch({ type: "room.spawned", workspace });
    return workspace;
  }

  private enableSpecKit(
    buildingId: Id,
    overrides?: Partial<ProjectSpecKit>,
  ): void {
    const specKit = initProjectSpecKit(overrides);
    this.dispatch({ type: "speckit.enabled", projectId: buildingId, specKit });
  }

  private advanceSpecKitPhase(buildingId: Id): void {
    const current = this.specKitOf(buildingId);
    const phase = nextSpecKitPhase(current?.phase ?? "constitution");
    const convergence: SpecKitConvergenceStatus =
      phase === "converge" ? "converged" : "in_progress";
    this.setSpecKitPhase(buildingId, phase, convergence);
  }

  private setSpecKitPhase(
    buildingId: Id,
    phase: SpecKitPhase,
    convergence?: SpecKitConvergenceStatus,
  ): void {
    const resolved: SpecKitConvergenceStatus =
      convergence ?? (phase === "converge" ? "converged" : "in_progress");
    this.dispatch({
      type: "speckit.phase.changed",
      projectId: buildingId,
      phase,
      convergence: resolved,
    });
  }

  private addSpecArtifact(input: AddSpecArtifactInput): SpecKitArtifact {
    const artifact = createSpecKitArtifact({
      id: nextId("spec"),
      projectId: input.buildingId,
      kind: input.kind,
      title: input.title,
      uri: input.uri,
      slug: input.slug,
      authorAgentId: input.authorAgentId,
    });
    this.dispatch({ type: "speckit.artifact.upserted", artifact });
    return artifact;
  }

  private instantiateAgent(request: InstantiateRequest): AgentInstance {
    const building =
      this.getBuilding(request.projectId) ?? this.firstBuilding();
    if (!building) throw new Error("no_building_loaded");

    const archetype = this.state.catalog.find(
      (a) => a.id === request.archetypeId,
    );
    if (!archetype) throw new Error(`unknown_archetype: ${request.archetypeId}`);

    const agent = buildAgentInstance({
      id: nextId("agent"),
      archetype,
      project: building,
      workspaces: this.workspacesOf(building.id),
      name: request.name,
      spawnWorkspaceId: request.workspaceId,
      stayInRoom: request.stayInRoom,
      rankKey: request.rankKey,
      supervisorId: request.supervisorId,
      harness: request.harness,
    });

    const peerIds = this.state.agents
      .filter((a) => a.workspaceId === agent.workspaceId)
      .map((a) => a.id);

    this.dispatch({ type: "agent.instantiated", agent, peerIds });
    return agent;
  }

  private spawnWorker(input: {
    actorId: Id;
    skill?: Skill;
    label?: string;
    spriteKey?: string;
  }): SpawnWorkerResult {
    const actor = this.getAgent(input.actorId);
    if (!actor) return { ok: false, reason: "unknown_actor" };
    const building = this.getBuilding(actor.projectId) ?? this.firstBuilding();
    if (!building) return { ok: false, reason: "unknown_actor" };

    const result = spawnAnonymousWorker({
      id: nextId("worker"),
      actor,
      project: building,
      workspaces: this.workspacesOf(building.id),
      skill: input.skill ?? actor.skill,
      label: input.label,
      spriteKey: input.spriteKey,
    });

    if (!result.ok) {
      this.dispatch({
        type: "worker.spawn.rejected",
        actorId: actor.id,
        reason: "rank_not_allowed",
      });
      return { ok: false, reason: "rank_not_allowed" };
    }

    this.dispatch({
      type: "worker.entered",
      worker: result.worker,
      spawnedById: actor.id,
    });
    return { ok: true, worker: result.worker };
  }

  private destroyWorker(input: {
    actorId: Id;
    workerId: Id;
  }): DestroyWorkerResult {
    const actor = this.getAgent(input.actorId);
    const worker = this.getAgent(input.workerId);
    if (!actor || !worker) return { ok: false, reason: "unknown" };
    if (!canDestroyWorker(actor, worker)) {
      return { ok: false, reason: "not_allowed" };
    }
    this.dispatch({
      type: "worker.exited",
      workerId: worker.id,
      spawnedById: actor.id,
    });
    return { ok: true, workerId: worker.id };
  }

  private callAgentToBuilding(input: {
    agentId: Id;
    toBuildingId: Id;
    reason?: string;
  }): CallResult {
    const agent = this.getAgent(input.agentId);
    if (!agent) return { ok: false, reason: "unknown_agent" };
    const destination = this.getBuilding(input.toBuildingId);
    if (!destination) return { ok: false, reason: "unknown_building" };
    if (destination.id === agent.homeProjectId) {
      return { ok: false, reason: "same_as_home" };
    }

    const call = issueProjectCall({
      id: nextId("call"),
      fromProjectId: destination.id,
      agent,
      reason: input.reason,
    });
    this.dispatch({ type: "project.call.issued", call });

    const moved = acceptProjectCall(
      agent,
      call,
      destination,
      this.workspacesOf(destination.id),
    );
    this.dispatch({ type: "project.call.accepted", callId: call.id, agentId: agent.id });
    this.dispatch({
      type: "agent.building.entered",
      agentId: agent.id,
      projectId: destination.id,
      workspaceId: moved.workspaceId,
      callId: call.id,
      correspondingOfficeFound: moved.workspaceId !== null,
    });
    return { ok: true, call };
  }

  private returnAgentHome(agentId: Id): ReturnHomeResult {
    const agent = this.getAgent(agentId);
    if (!agent) return { ok: false, reason: "unknown_agent" };
    if (!agent.activeCallId) return { ok: false, reason: "not_on_call" };

    const home = returnHomeFromCall(agent);
    this.dispatch({
      type: "agent.returned_home",
      agentId: agent.id,
      homeProjectId: home.homeProjectId,
      homeWorkspaceId: home.homeWorkspaceId,
      callId: agent.activeCallId,
    });
    return { ok: true, agentId: agent.id };
  }

  private hostJoin(input: HostJoinInput): AgentHost {
    const host = buildAgentHost({
      id: nextId("host"),
      label: input.label,
      campusUrl: input.campusUrl,
      machineId: input.machineId,
      allowedRankKeys: input.allowedRankKeys,
      allowedSkillKeys: input.allowedSkillKeys,
      version: input.version,
    });
    this.dispatch({ type: "host.joined", host });
    return host;
  }

  private spawnRuntime(input: {
    hostId: Id;
    agentId: Id;
    workingDir?: string;
  }): SpawnRuntimeResult {
    const host = this.getHost(input.hostId);
    if (!host) return { ok: false, reason: "unknown_host" };
    if (host.status !== "online") return { ok: false, reason: "host_offline" };
    const agent = this.getAgent(input.agentId);
    if (!agent) return { ok: false, reason: "unknown_agent" };
    if (agent.runtimeId != null) return { ok: false, reason: "already_running" };

    const runtime = buildAgentRuntime({
      id: nextId("runtime"),
      host,
      agent,
      workingDir: input.workingDir,
    });
    this.dispatch({ type: "runtime.started", runtime });
    return { ok: true, runtime };
  }

  private stopRuntime(runtimeId: Id): StopRuntimeResult {
    const runtime = this.state.runtimes.find((r) => r.id === runtimeId);
    if (!runtime) return { ok: false, reason: "unknown_runtime" };
    this.dispatch({
      type: "runtime.stopped",
      runtimeId: runtime.id,
      agentId: runtime.agentId,
      hostId: runtime.hostId,
    });
    return { ok: true, runtimeId: runtime.id };
  }

  private issueOrder(input: OrderInput): AgentOrder {
    const order = buildOrder({
      id: nextId("order"),
      toAgentId: input.toAgentId,
      fromActorId: input.fromActorId,
      fromKind: input.fromKind,
      instruction: input.instruction,
    });
    this.dispatch({ type: "order.issued", order });

    const task = orderCreatesTask(order, nextId("task"));
    const inventory = [...this.tasksForAgent(order.toAgentId), task];
    this.dispatch({
      type: "task.inventory.updated",
      agentId: order.toAgentId,
      tasks: inventory,
    });
    return order;
  }

  private addTask(input: AddTaskInput): AgentTask {
    const task = createTask({
      id: nextId("task"),
      agentId: input.agentId,
      title: input.title,
      status: input.status,
      orderedById: input.orderedById,
    });
    const inventory = [...this.tasksForAgent(input.agentId), task];
    this.dispatch({
      type: "task.inventory.updated",
      agentId: input.agentId,
      tasks: inventory,
    });
    return task;
  }
}

export interface OrderInput {
  toAgentId: Id;
  fromActorId: Id;
  fromKind: "human" | "agent";
  instruction: string;
}

export interface AddTaskInput {
  agentId: Id;
  title: string;
  status?: RunStatus;
  orderedById?: Id;
}

export interface AddSpecArtifactInput {
  buildingId: Id;
  kind: SpecKitArtifactKind;
  title: string;
  uri: string;
  slug?: string;
  authorAgentId?: Id;
}

/** Pure reducer: (state, event) -> state. Unknown events are no-ops. */
export function reduce(state: CampusState, event: CampusEvent): CampusState {
  switch (event.type) {
    case "campus.loaded":
      return { ...state, campus: event.campus };

    case "project.loaded":
      return {
        ...state,
        buildings: upsertById(state.buildings, event.project),
        workspaces: dedupeById([...state.workspaces, ...event.workspaces]),
        catalog: event.catalog,
        agents: dedupeById([...state.agents, ...event.agents]),
        runs: event.runs,
      };

    case "building.spawned":
      return { ...state, buildings: upsertById(state.buildings, event.project) };

    case "room.spawned":
      return {
        ...state,
        workspaces: [...state.workspaces, event.workspace],
        buildings: state.buildings.map((b) =>
          b.id === event.workspace.projectId
            ? withWorkspace(b, event.workspace.id)
            : b,
        ),
      };

    case "catalog.loaded":
      return { ...state, catalog: event.catalog };

    case "library.loaded":
      return {
        ...state,
        library: event.library,
        classifications: event.classifications,
        documents: event.documents,
      };

    case "agent.instantiated":
    case "worker.entered": {
      const agent = event.type === "worker.entered" ? event.worker : event.agent;
      if (state.agents.some((a) => a.id === agent.id)) return state;
      return { ...state, agents: [...state.agents, agent] };
    }

    case "agent.introduction.completed":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          introducing: false,
        }),
      };

    case "agent.homing":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          workspaceId: event.homeWorkspaceId,
        }),
      };

    case "agent.moved":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          workspaceId: event.workspaceId,
          anchorId: event.anchorId,
        }),
      };

    case "agent.mood":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, { mood: event.mood }),
      };

    case "agent.harness.updated":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          harness: event.harness,
        }),
      };

    case "agent.rank.updated":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          rankKey: event.rankKey,
          supervisorId: event.supervisorId,
        }),
      };

    case "project.call.issued":
      return { ...state, calls: [...state.calls, event.call] };

    case "project.call.accepted":
      return {
        ...state,
        calls: state.calls.map((c) =>
          c.id === event.callId ? { ...c, status: "active" } : c,
        ),
      };

    case "agent.building.entered":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          projectId: event.projectId,
          workspaceId: event.workspaceId,
          activeCallId: event.callId,
        }),
      };

    case "agent.returned_home":
      return {
        ...state,
        agents: patchAgent(state.agents, event.agentId, {
          projectId: event.homeProjectId,
          workspaceId: event.homeWorkspaceId,
          activeCallId: null,
        }),
        calls: state.calls.map((c) =>
          c.id === event.callId ? { ...c, status: "completed" } : c,
        ),
      };

    case "agent.despawned":
    case "worker.exited": {
      const id = event.type === "worker.exited" ? event.workerId : event.agentId;
      return { ...state, agents: state.agents.filter((a) => a.id !== id) };
    }

    case "org.head.assigned":
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === event.workspaceId
            ? { ...w, headAgentId: event.headAgentId }
            : w,
        ),
      };

    case "building.context.updated":
      return {
        ...state,
        buildings: state.buildings.map((b) =>
          b.id === event.projectId ? { ...b, context: event.context } : b,
        ),
      };

    case "department.context.updated":
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === event.workspaceId ? { ...w, context: event.context } : w,
        ),
      };

    case "speckit.enabled":
      return {
        ...state,
        buildings: state.buildings.map((b) =>
          b.id === event.projectId ? { ...b, specKit: event.specKit } : b,
        ),
      };

    case "speckit.phase.changed":
      return {
        ...state,
        buildings: state.buildings.map((b) => {
          if (b.id !== event.projectId) return b;
          const specKit = b.specKit ?? initProjectSpecKit();
          return {
            ...b,
            specKit: {
              ...specKit,
              phase: event.phase,
              convergence: event.convergence,
            },
          };
        }),
      };

    case "speckit.artifact.upserted":
      return {
        ...state,
        specArtifacts: upsertById(state.specArtifacts, event.artifact),
      };

    case "host.joined":
      return { ...state, hosts: upsertById(state.hosts, event.host) };

    case "host.heartbeat":
      return {
        ...state,
        hosts: state.hosts.map((h) =>
          h.id === event.hostId
            ? { ...h, lastSeenAt: event.at, status: "online" }
            : h,
        ),
      };

    case "host.left": {
      const goneRuntimes = state.runtimes.filter(
        (r) => r.hostId === event.hostId,
      );
      const goneAgentIds = new Set(goneRuntimes.map((r) => r.agentId));
      return {
        ...state,
        hosts: state.hosts.map((h) =>
          h.id === event.hostId ? { ...h, status: "offline" } : h,
        ),
        runtimes: state.runtimes.filter((r) => r.hostId !== event.hostId),
        agents: state.agents.map((a) =>
          goneAgentIds.has(a.id) ? { ...a, hostId: null, runtimeId: null } : a,
        ),
      };
    }

    case "runtime.started":
      return {
        ...state,
        runtimes: upsertById(state.runtimes, event.runtime),
        agents: patchAgent(state.agents, event.runtime.agentId, {
          hostId: event.runtime.hostId,
          runtimeId: event.runtime.id,
        }),
      };

    case "runtime.stopped":
      return {
        ...state,
        runtimes: state.runtimes.filter((r) => r.id !== event.runtimeId),
        agents: patchAgent(state.agents, event.agentId, {
          hostId: null,
          runtimeId: null,
        }),
      };

    case "task.inventory.updated": {
      const others = state.tasks.filter((t) => t.agentId !== event.agentId);
      return { ...state, tasks: [...others, ...event.tasks] };
    }

    case "order.issued":
      return { ...state, orders: [...state.orders, event.order] };

    case "order.updated":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === event.order.id ? event.order : o,
        ),
      };

    case "run.upserted":
      return { ...state, runs: upsertById(state.runs, event.run) };

    case "run.removed":
      return { ...state, runs: state.runs.filter((r) => r.id !== event.runId) };

    case "library.document.upserted":
      return {
        ...state,
        documents: upsertById(state.documents, event.document),
      };

    case "library.document.removed":
      return {
        ...state,
        documents: state.documents.filter((d) => d.id !== event.documentId),
      };

    case "library.classification.upserted":
      return {
        ...state,
        classifications: upsertById(
          state.classifications,
          event.classification,
        ),
      };

    default:
      return state;
  }
}

function patchAgent(
  agents: AgentInstance[],
  id: Id,
  patch: Partial<AgentInstance>,
): AgentInstance[] {
  return agents.map((a) => (a.id === id ? { ...a, ...patch } : a));
}

function dedupeById<T extends { id: Id }>(items: T[]): T[] {
  const seen = new Map<Id, T>();
  for (const item of items) seen.set(item.id, item);
  return [...seen.values()];
}

function upsertById<T extends { id: Id }>(items: T[], item: T): T[] {
  const exists = items.some((i) => i.id === item.id);
  return exists
    ? items.map((i) => (i.id === item.id ? item : i))
    : [...items, item];
}
