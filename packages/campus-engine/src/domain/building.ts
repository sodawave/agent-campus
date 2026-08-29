/**
 * Building (environment) helpers (pure).
 */

import { BOSS_ROOM_ROLE, type Room } from "./types";

/** True for the boss office room (created with the building; non-deletable). */
export function isBossRoom(room: Room): boolean {
  return room.role === BOSS_ROOM_ROLE;
}
