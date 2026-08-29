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

    case "building.spawned": {
      const { building } = event;
      if (!state.campus || building.campusId !== state.campus.id) return state;
      if (state.buildings.some((b) => b.id === building.id)) return state;
      return { ...state, buildings: [...state.buildings, building] };
    }

    case "room.spawned": {
      const { room } = event;
      if (!state.buildings.some((b) => b.id === room.buildingId)) return state;
      if (state.rooms.some((r) => r.id === room.id)) return state;
      return { ...state, rooms: [...state.rooms, room] };
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

    default:
      return state;
  }
}

/** Fold a whole event log into a state (left-to-right). */
export function reduceAll(state: State, events: readonly CampusEvent[]): State {
  return events.reduce(reduce, state);
}
