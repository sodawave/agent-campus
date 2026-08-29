/**
 * Building (environment) helpers (pure).
 */

import { LEADER_ROOM_ROLE, type Room } from "./types";

/** True for the leader office room (created with the building; non-deletable). */
export function isLeaderRoom(room: Room): boolean {
  return room.role === LEADER_ROOM_ROLE;
}
