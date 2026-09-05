/**
 * Library read helpers (pure). Documents bind to agents by craft (skillKey):
 * a classification lists skillKeys; a document belongs to classifications.
 */

import type { LibraryDocument, State } from "./types";

/** Documents reachable by a given craft/oficio key (campus-scoped). */
export function documentsForSkill(state: State, skillKey: string): LibraryDocument[] {
  const classIds = new Set(
    state.classifications
      .filter((c) => c.skillKeys.includes(skillKey))
      .map((c) => c.id),
  );
  return state.documents.filter((d) =>
    d.classificationIds.some((id) => classIds.has(id)),
  );
}
