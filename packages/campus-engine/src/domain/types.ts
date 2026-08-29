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
}

/**
 * Facts emitted by the core, consumed by any client (JSON-serializable,
 * language-neutral). Named `entity.pastTense`.
 */
export type CampusEvent =
  | { type: "campus.loaded"; campus: Campus }
  | { type: "building.spawned"; building: Building }
  | { type: "room.spawned"; room: Room };

/** Read-only projection reconstructed from the event log. */
export interface State {
  campus: Campus | null;
  buildings: Building[];
  rooms: Room[];
}

/** Canonical empty projection. */
export const EMPTY_STATE: State = {
  campus: null,
  buildings: [],
  rooms: [],
};
