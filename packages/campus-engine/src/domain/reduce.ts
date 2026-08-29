/**
 * Pure, idempotent, tolerant reducer. Rebuilds `State` from a `CampusEvent`
 * log. Never mutates the input. Inconsistent, duplicate or unknown events
 * leave the state unchanged (read-only projection).
 */

import type { CampusEvent, State, TaskStatus } from "./types";

/** Set a task's status immutably (no-op if the task is absent). */
function mapTaskStatus(state: State, taskId: string, status: TaskStatus): State {
  if (!state.tasks.some((t) => t.id === taskId)) return state;
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
  };
}

export function reduce(state: State, event: CampusEvent): State {
  switch (event.type) {
    case "campus.loaded": {
      if (state.campus && state.campus.id === event.campus.id) return state;
      return { ...state, campus: event.campus };
    }

    case "campus.config.updated": {
      return { ...state, config: event.config };
    }

    case "campus.provider.upserted": {
      const { provider } = event;
      const exists = state.config.providers.some((p) => p.id === provider.id);
      const providers = exists
        ? state.config.providers.map((p) => (p.id === provider.id ? provider : p))
        : [...state.config.providers, provider];
      return { ...state, config: { ...state.config, providers } };
    }

    case "campus.provider.removed": {
      const { providerId } = event;
      const providers = state.config.providers.filter((p) => p.id !== providerId);
      const defaultModel =
        state.config.defaultModel && state.config.defaultModel.providerId === providerId
          ? null
          : state.config.defaultModel;
      return { ...state, config: { ...state.config, providers, defaultModel } };
    }

    case "campus.defaultModel.set": {
      return { ...state, config: { ...state.config, defaultModel: event.model } };
    }

    case "building.spawned": {
      const { building, leaderRoom, leaderAgent } = event;
      if (!state.campus || building.campusId !== state.campus.id) return state;
      if (state.buildings.some((b) => b.id === building.id)) return state;
      const rooms =
        leaderRoom && !state.rooms.some((r) => r.id === leaderRoom.id)
          ? [...state.rooms, leaderRoom]
          : state.rooms;
      const agents =
        leaderAgent && !state.agents.some((a) => a.id === leaderAgent.id)
          ? [...state.agents, leaderAgent]
          : state.agents;
      return { ...state, buildings: [...state.buildings, building], rooms, agents };
    }

    case "building.context.updated": {
      const { buildingId, context } = event;
      if (!state.buildings.some((b) => b.id === buildingId)) return state;
      return {
        ...state,
        buildings: state.buildings.map((b) =>
          b.id === buildingId ? { ...b, context } : b,
        ),
      };
    }

    case "building.lead.assigned": {
      const { buildingId, agentId } = event;
      if (!state.buildings.some((b) => b.id === buildingId)) return state;
      return {
        ...state,
        buildings: state.buildings.map((b) =>
          b.id === buildingId ? { ...b, leaderAgentId: agentId } : b,
        ),
      };
    }

    case "room.spawned": {
      const { room } = event;
      if (!state.buildings.some((b) => b.id === room.buildingId)) return state;
      if (state.rooms.some((r) => r.id === room.id)) return state;
      return { ...state, rooms: [...state.rooms, room] };
    }

    case "room.context.updated": {
      const { roomId, context } = event;
      if (!state.rooms.some((r) => r.id === roomId)) return state;
      return {
        ...state,
        rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, context } : r)),
      };
    }

    case "room.deleted": {
      const { roomId } = event;
      if (!state.rooms.some((r) => r.id === roomId)) return state;
      return { ...state, rooms: state.rooms.filter((r) => r.id !== roomId) };
    }

    case "project.created": {
      const { project } = event;
      const building = state.buildings.find((b) => b.id === project.buildingId);
      if (!building) return state;
      if (state.projects.some((p) => p.id === project.id)) return state;
      // Auto-assign the building leader so it has the project in its context.
      // Normal assignment (removable via project.unassign); idempotent.
      const leaderId = building.leaderAgentId ?? null;
      const assignments =
        leaderId != null &&
        !state.assignments.some((x) => x.agentId === leaderId && x.projectId === project.id)
          ? [...state.assignments, { agentId: leaderId, projectId: project.id }]
          : state.assignments;
      return { ...state, projects: [...state.projects, project], assignments };
    }

    case "project.archived": {
      const { projectId } = event;
      if (!state.projects.some((p) => p.id === projectId)) return state;
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, status: "archived" } : p,
        ),
      };
    }

    case "project.assigned": {
      const { agentId, projectId } = event;
      if (state.assignments.some((x) => x.agentId === agentId && x.projectId === projectId)) {
        return state;
      }
      return { ...state, assignments: [...state.assignments, { agentId, projectId }] };
    }

    case "project.unassigned": {
      const { agentId, projectId } = event;
      if (!state.assignments.some((x) => x.agentId === agentId && x.projectId === projectId)) {
        return state;
      }
      return {
        ...state,
        assignments: state.assignments.filter(
          (x) => !(x.agentId === agentId && x.projectId === projectId),
        ),
      };
    }

    case "chat.message.posted": {
      const { message } = event;
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { ...state, messages: [...state.messages, message] };
    }

    case "agent.instantiated": {
      const { agent } = event;
      if (!state.buildings.some((b) => b.id === agent.buildingId)) return state;
      const roomOk = state.rooms.some(
        (r) => r.id === agent.roomId && r.buildingId === agent.buildingId,
      );
      if (!roomOk) return state;
      if (state.agents.some((a) => a.id === agent.id)) return state;
      return { ...state, agents: [...state.agents, agent] };
    }

    case "agent.harness.set": {
      const { agentId, harness } = event;
      if (!state.agents.some((a) => a.id === agentId)) return state;
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === agentId ? { ...a, harness } : a)),
      };
    }

    case "agent.supervisor.assigned": {
      const { agentId, supervisorId } = event;
      if (!state.agents.some((a) => a.id === agentId)) return state;
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === agentId ? { ...a, supervisorId } : a,
        ),
      };
    }

    case "room.head.assigned": {
      const { roomId, agentId } = event;
      if (!state.rooms.some((r) => r.id === roomId)) return state;
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === roomId ? { ...r, headAgentId: agentId } : r,
        ),
      };
    }

    case "worker.entered": {
      const { worker } = event;
      if (state.workers.some((w) => w.id === worker.id)) return state;
      return { ...state, workers: [...state.workers, worker] };
    }

    case "worker.exited": {
      const { workerId } = event;
      if (!state.workers.some((w) => w.id === workerId)) return state;
      return { ...state, workers: state.workers.filter((w) => w.id !== workerId) };
    }

    case "task.created": {
      const { task } = event;
      if (state.tasks.some((t) => t.id === task.id)) return state;
      return { ...state, tasks: [...state.tasks, task] };
    }

    case "task.started":
      return mapTaskStatus(state, event.taskId, "running");

    case "task.submitted":
      return mapTaskStatus(state, event.taskId, "under_review");

    case "task.evaluated": {
      const { taskId, evaluatorId, verdict } = event;
      if (!state.tasks.some((t) => t.id === taskId)) return state;
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: verdict, evaluatorId, verdict }
            : t,
        ),
      };
    }

    case "debate.opened": {
      const { debate } = event;
      if (state.debates.some((d) => d.id === debate.id)) return state;
      return { ...state, debates: [...state.debates, debate] };
    }

    case "debate.closed": {
      const { debateId } = event;
      if (!state.debates.some((d) => d.id === debateId)) return state;
      return {
        ...state,
        debates: state.debates.map((d) =>
          d.id === debateId ? { ...d, status: "closed" } : d,
        ),
      };
    }

    case "project.call.issued": {
      const { call } = event;
      if (state.calls.some((c) => c.id === call.id)) return state;
      if (!state.agents.some((a) => a.id === call.agentId)) return state;
      return {
        ...state,
        calls: [...state.calls, call],
        // Move representation to the calling building/room; keep execution (host).
        agents: state.agents.map((a) =>
          a.id === call.agentId
            ? { ...a, buildingId: call.toBuildingId, roomId: call.toRoomId, activeCallId: call.id }
            : a,
        ),
      };
    }

    case "project.call.closed": {
      const { callId, agentId } = event;
      const call = state.calls.find((c) => c.id === callId);
      if (!call) return state;
      return {
        ...state,
        calls: state.calls.map((c) =>
          c.id === callId ? { ...c, status: "closed" } : c,
        ),
        // Return the agent home (origin captured at call time).
        agents: state.agents.map((a) =>
          a.id === agentId
            ? { ...a, buildingId: call.originBuildingId, roomId: call.originRoomId, activeCallId: null }
            : a,
        ),
      };
    }

    case "memory.remembered": {
      const { record } = event;
      if (state.memories.some((m) => m.id === record.id)) return state;
      return { ...state, memories: [...state.memories, record] };
    }

    case "speckit.enabled": {
      const { buildingId, phase } = event;
      if (state.specKits.some((s) => s.buildingId === buildingId)) return state;
      return { ...state, specKits: [...state.specKits, { buildingId, phase }] };
    }

    case "speckit.phase.changed": {
      const { buildingId, phase } = event;
      if (!state.specKits.some((s) => s.buildingId === buildingId)) return state;
      return {
        ...state,
        specKits: state.specKits.map((s) =>
          s.buildingId === buildingId ? { ...s, phase } : s,
        ),
      };
    }

    case "speckit.artifact.upserted": {
      const { artifact } = event;
      const exists = state.specArtifacts.some((a) => a.id === artifact.id);
      return {
        ...state,
        specArtifacts: exists
          ? state.specArtifacts.map((a) => (a.id === artifact.id ? artifact : a))
          : [...state.specArtifacts, artifact],
      };
    }

    case "host.joined": {
      const { host } = event;
      if (state.hosts.some((h) => h.id === host.id)) return state;
      return { ...state, hosts: [...state.hosts, host] };
    }

    case "host.left": {
      const { hostId } = event;
      if (!state.hosts.some((h) => h.id === hostId)) return state;
      const stoppedRuntimeIds = new Set(
        state.runtimes.filter((r) => r.hostId === hostId).map((r) => r.id),
      );
      return {
        ...state,
        hosts: state.hosts.filter((h) => h.id !== hostId),
        runtimes: state.runtimes.map((r) =>
          r.hostId === hostId ? { ...r, status: "stopped" } : r,
        ),
        // Any agent alive via this host goes offline.
        agents: state.agents.map((a) =>
          a.runtimeId != null && stoppedRuntimeIds.has(a.runtimeId)
            ? { ...a, hostId: null, runtimeId: null }
            : a,
        ),
      };
    }

    case "runtime.started": {
      const { runtime } = event;
      if (state.runtimes.some((r) => r.id === runtime.id)) return state;
      return {
        ...state,
        runtimes: [...state.runtimes, runtime],
        agents: state.agents.map((a) =>
          a.id === runtime.agentId
            ? { ...a, hostId: runtime.hostId, runtimeId: runtime.id }
            : a,
        ),
      };
    }

    case "runtime.stopped": {
      const { runtimeId } = event;
      const runtime = state.runtimes.find((r) => r.id === runtimeId);
      if (!runtime) return state;
      return {
        ...state,
        runtimes: state.runtimes.map((r) =>
          r.id === runtimeId ? { ...r, status: "stopped" } : r,
        ),
        agents: state.agents.map((a) =>
          a.runtimeId === runtimeId ? { ...a, hostId: null, runtimeId: null } : a,
        ),
      };
    }

    case "library.classification.upserted": {
      const { classification } = event;
      const exists = state.classifications.some((c) => c.id === classification.id);
      return {
        ...state,
        classifications: exists
          ? state.classifications.map((c) => (c.id === classification.id ? classification : c))
          : [...state.classifications, classification],
      };
    }

    case "library.document.upserted": {
      const { document } = event;
      const exists = state.documents.some((d) => d.id === document.id);
      return {
        ...state,
        documents: exists
          ? state.documents.map((d) => (d.id === document.id ? document : d))
          : [...state.documents, document],
      };
    }

    default:
      return state;
  }
}

/** Fold a whole event log into a state (left-to-right). */
export function reduceAll(state: State, events: readonly CampusEvent[]): State {
  return events.reduce(reduce, state);
}
