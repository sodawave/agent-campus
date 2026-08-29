/**
 * Spec Kit (SDD) helpers per building (pure).
 */

import { SPECKIT_PHASES, type SpecKitPhase, type State } from "./types";

/** The next SDD phase after `phase`, or null at the last one (converge). */
export function nextSpecKitPhase(phase: SpecKitPhase): SpecKitPhase | null {
  const i = SPECKIT_PHASES.indexOf(phase);
  if (i < 0 || i >= SPECKIT_PHASES.length - 1) return null;
  return SPECKIT_PHASES[i + 1] ?? null;
}

/** True when a building has Spec Kit enabled. */
export function projectHasSpecKit(state: State, buildingId: string): boolean {
  return state.specKits.some((s) => s.buildingId === buildingId);
}
