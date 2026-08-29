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
  Room,
  State,
} from "./types";

/** Requests from a client/host to the core (validable, rejectable). */
export type CampusCommand =
  | { type: "campus.load"; campus: Campus }
  | { type: "building.spawn"; building: Building }
  | { type: "room.spawn"; room: Room }
  | { type: "agent.instantiate"; agent: AgentInstance };

export type RejectionReason =
  | "campus_already_loaded"
  | "campus_not_loaded"
  | "campus_mismatch"
  | "building_not_found"
  | "room_not_found_in_building"
  | "duplicate_id";

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
  }
}
