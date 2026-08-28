/**
 * CampusStore — client-side source of truth.
 *
 * Holds the loaded project, catalog, library and the live agent instances,
 * and applies {@link CampusEvent}s idempotently. Higher-level command helpers
 * build events with the pure domain functions and dispatch them, so the UI
 * never encodes business rules itself (see TECH_SPEC §4).
 */

import { buildAgentInstance } from "../domain/context";
import {
  createTask,
  issueOrder as buildOrder,
  orderCreatesTask,
  tasksForAgent,
} from "../domain/tasks";
import {
  canDestroyWorker,
  spawnAnonymousWorker,
} from "../domain/workers";
import type {
  AgentArchetype,
  AgentInstance,
  AgentOrder,
  AgentTask,
  CampusEvent,
  DocClassification,
  HarnessParams,
  Id,
  InstantiateRequest,
  Library,
  LibraryDocument,
  Project,
  Run,
  RunStatus,
  Skill,
  Workspace,
} from "../domain/types";

export interface CampusState {
  project: Project | null;
  workspaces: Workspace[];
  catalog: AgentArchetype[];
  library: Library | null;
  classifications: DocClassification[];
  documents: LibraryDocument[];
  agents: AgentInstance[];
  runs: Run[];
  orders: AgentOrder[];
  tasks: AgentTask[];
}

export interface LoadProjectInput {
  project: Project;
  workspaces: Workspace[];
  catalog: AgentArchetype[];
  library?: Library | null;
  classifications?: DocClassification[];
  documents?: LibraryDocument[];
  agents?: AgentInstance[];
  runs?: Run[];
}

type Listener = (state: CampusState, event: CampusEvent | null) => void;

export type SpawnWorkerResult =
  | { ok: true; worker: AgentInstance }
  | { ok: false; reason: "rank_not_allowed" | "unknown_actor" };

export type DestroyWorkerResult =
  | { ok: true; workerId: Id }
  | { ok: false; reason: "not_allowed" | "unknown" };

let idCounter = 0;
function nextId(prefix: string): Id {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export class CampusStore {
  private state: CampusState = {
    project: null,
    workspaces: [],
    catalog: [],
    library: null,
    classifications: [],
    documents: [],
    agents: [],
    runs: [],
    orders: [],
    tasks: [],
  };

  private readonly listeners = new Set<Listener>();
  private readonly log: CampusEvent[] = [];

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

  namedAgents(): AgentInstance[] {
    return this.state.agents.filter((a) => a.kind === "named");
  }

  workers(): AgentInstance[] {
    return this.state.agents.filter((a) => a.kind === "anonymous_worker");
  }

  agentsInWorkspace(workspaceId: Id): AgentInstance[] {
    return this.state.agents.filter((a) => a.workspaceId === workspaceId);
  }

  tasksForAgent(agentId: Id): AgentTask[] {
    return tasksForAgent(this.state.tasks, agentId);
  }

  /** Apply an event to the state (idempotent) and notify listeners. */
  dispatch(event: CampusEvent): void {
    this.log.push(event);
    this.state = reduce(this.state, event);
    this.emit(event);
  }

  private emit(event: CampusEvent | null): void {
    for (const listener of this.listeners) listener(this.state, event);
  }

  // --- Command helpers (build events via pure domain functions) ---

  loadProject(input: LoadProjectInput): void {
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

  instantiateAgent(request: InstantiateRequest): AgentInstance {
    const project = this.requireProject();
    const archetype = this.state.catalog.find(
      (a) => a.id === request.archetypeId,
    );
    if (!archetype) throw new Error(`unknown_archetype: ${request.archetypeId}`);

    const agent = buildAgentInstance({
      id: nextId("agent"),
      archetype,
      project,
      workspaces: this.state.workspaces,
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

  completeIntroduction(agentId: Id): void {
    this.dispatch({ type: "agent.introduction.completed", agentId });
  }

  spawnWorker(input: {
    actorId: Id;
    skill?: Skill;
    label?: string;
    spriteKey?: string;
  }): SpawnWorkerResult {
    const project = this.requireProject();
    const actor = this.getAgent(input.actorId);
    if (!actor) return { ok: false, reason: "unknown_actor" };

    const result = spawnAnonymousWorker({
      id: nextId("worker"),
      actor,
      project,
      workspaces: this.state.workspaces,
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

  destroyWorker(input: { actorId: Id; workerId: Id }): DestroyWorkerResult {
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

  updateHarness(agentId: Id, harness: HarnessParams): void {
    this.dispatch({ type: "agent.harness.updated", agentId, harness });
  }

  assignHead(workspaceId: Id, headAgentId: Id): void {
    this.dispatch({ type: "org.head.assigned", workspaceId, headAgentId });
  }

  issueOrder(input: {
    toAgentId: Id;
    fromActorId: Id;
    fromKind: "human" | "agent";
    instruction: string;
  }): AgentOrder {
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

  addTask(input: {
    agentId: Id;
    title: string;
    status?: RunStatus;
    orderedById?: Id;
  }): AgentTask {
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

  private requireProject(): Project {
    if (!this.state.project) throw new Error("no_project_loaded");
    return this.state.project;
  }
}

/** Pure reducer: (state, event) -> state. Unknown events are no-ops. */
export function reduce(state: CampusState, event: CampusEvent): CampusState {
  switch (event.type) {
    case "project.loaded":
      return {
        ...state,
        project: event.project,
        workspaces: event.workspaces,
        catalog: event.catalog,
        agents: dedupeById([...state.agents, ...event.agents]),
        runs: event.runs,
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
      return {
        ...state,
        runs: upsertById(state.runs, event.run),
      };

    case "run.removed":
      return {
        ...state,
        runs: state.runs.filter((r) => r.id !== event.runId),
      };

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
  return exists ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
}
