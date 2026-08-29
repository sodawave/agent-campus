/**
 * Command contract (control plane authority). A `CampusCommand` is a *request*
 * that `execute` validates against the current state and either accepts (turning
 * it into a `CampusEvent` fact) or rejects with a typed reason. Pure, no I/O.
 */

import type {
  AgentInstance,
  Building,
  Campus,
  CampusEvent,
  Id,
  Room,
  State,
} from "./types";
import { WORKER_SPAWNER_RANK_KEY } from "./types";

/** Requests from a client/host to the core (validable, rejectable). */
export type CampusCommand =
  | { type: "campus.load"; campus: Campus }
  | { type: "building.spawn"; building: Building }
  | { type: "room.spawn"; room: Room }
  | { type: "agent.instantiate"; agent: AgentInstance }
  | { type: "agent.assignSupervisor"; agentId: Id; supervisorId: Id | null }
  | { type: "room.assignHead"; roomId: Id; agentId: Id }
  | { type: "worker.spawn"; actorId: Id; worker: AgentInstance }
  | { type: "worker.despawn"; actorId: Id; workerId: Id };

export type RejectionReason =
  | "campus_already_loaded"
  | "campus_not_loaded"
  | "campus_mismatch"
  | "building_not_found"
  | "room_not_found_in_building"
  | "duplicate_id"
  | "agent_not_found"
  | "supervisor_not_found"
  | "self_supervision"
  | "room_not_found"
  | "agent_not_in_room"
  | "actor_not_found"
  | "rank_not_allowed"
  | "worker_not_found"
  | "not_worker_spawner";

export type CommandResult =
  | { ok: true; event: CampusEvent }
  | { ok: false; reason: RejectionReason };

const accept = (event: CampusEvent): CommandResult => ({ ok: true, event });
const reject = (reason: RejectionReason): CommandResult => ({ ok: false, reason });

/** Validate a command against the state; return an accepted event or a rejection. */
export function execute(state: State, command: CampusCommand): CommandResult {
  switch (command.type) {
    case "campus.load": {
      if (state.campus && state.campus.id !== command.campus.id) {
        return reject("campus_already_loaded");
      }
      return accept({ type: "campus.loaded", campus: command.campus });
    }

    case "building.spawn": {
      const { building } = command;
      if (!state.campus) return reject("campus_not_loaded");
      if (building.campusId !== state.campus.id) return reject("campus_mismatch");
      if (state.buildings.some((b) => b.id === building.id)) {
        return reject("duplicate_id");
      }
      return accept({ type: "building.spawned", building });
    }

    case "room.spawn": {
      const { room } = command;
      if (!state.buildings.some((b) => b.id === room.buildingId)) {
        return reject("building_not_found");
      }
      if (state.rooms.some((r) => r.id === room.id)) return reject("duplicate_id");
      return accept({ type: "room.spawned", room });
    }

    case "agent.instantiate": {
      const { agent } = command;
      if (!state.buildings.some((b) => b.id === agent.buildingId)) {
        return reject("building_not_found");
      }
      const roomOk = state.rooms.some(
        (r) => r.id === agent.roomId && r.buildingId === agent.buildingId,
      );
      if (!roomOk) return reject("room_not_found_in_building");
      if (state.agents.some((a) => a.id === agent.id)) return reject("duplicate_id");
      return accept({ type: "agent.instantiated", agent });
    }

    case "agent.assignSupervisor": {
      const { agentId, supervisorId } = command;
      if (!state.agents.some((a) => a.id === agentId)) return reject("agent_not_found");
      if (supervisorId !== null) {
        if (supervisorId === agentId) return reject("self_supervision");
        if (!state.agents.some((a) => a.id === supervisorId)) {
          return reject("supervisor_not_found");
        }
      }
      return accept({ type: "agent.supervisor.assigned", agentId, supervisorId });
    }

    case "room.assignHead": {
      const { roomId, agentId } = command;
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room) return reject("room_not_found");
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return reject("agent_not_found");
      if (agent.roomId !== roomId) return reject("agent_not_in_room");
      return accept({ type: "room.head.assigned", roomId, agentId });
    }

    case "worker.spawn": {
      const { actorId, worker } = command;
      const actor = state.agents.find((a) => a.id === actorId);
      if (!actor) return reject("actor_not_found");
      if (actor.rankKey !== WORKER_SPAWNER_RANK_KEY) return reject("rank_not_allowed");
      if (!state.buildings.some((b) => b.id === worker.buildingId)) {
        return reject("building_not_found");
      }
      const roomOk = state.rooms.some(
        (r) => r.id === worker.roomId && r.buildingId === worker.buildingId,
      );
      if (!roomOk) return reject("room_not_found_in_building");
      const dup =
        state.workers.some((w) => w.id === worker.id) ||
        state.agents.some((a) => a.id === worker.id);
      if (dup) return reject("duplicate_id");
      return accept({ type: "worker.entered", worker: { ...worker, spawnedById: actorId } });
    }

    case "worker.despawn": {
      const { actorId, workerId } = command;
      const worker = state.workers.find((w) => w.id === workerId);
      if (!worker) return reject("worker_not_found");
      if (worker.spawnedById !== actorId) return reject("not_worker_spawner");
      return accept({ type: "worker.exited", workerId });
    }
  }
}
