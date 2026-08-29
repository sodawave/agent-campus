/**
 * Project helpers (pure). The inventory of a building = its projects.
 */

import type { Project, State } from "./types";

/** The project inventory of a building. */
export function projectsForBuilding(state: State, buildingId: string): Project[] {
  return state.projects.filter((p) => p.buildingId === buildingId);
}
