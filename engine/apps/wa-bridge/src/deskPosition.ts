import type { AgentRef } from "./types";

/**
 * Pixel desks keyed by Room.waAreaId (logical private-space id on the starter map).
 * Until the WA editor names match these ids, they are campus-side area keys.
 */
export const AREA_DESKS: Record<string, { x: number; y: number }> = {
  "area-mkt": { x: 288, y: 352 },
  "area-dev": { x: 480, y: 352 },
  "area-ops": { x: 288, y: 512 },
  "area-fin": { x: 480, y: 512 },
  "area-lab": { x: 384, y: 640 },
  "area-alpha-leader": { x: 256, y: 288 },
  "area-beta-leader": { x: 520, y: 288 },
  "area-gamma-leader": { x: 160, y: 480 },
};

/** @deprecated Prefer waAreaId → AREA_DESKS; kept for agents without area binding. */
const ROOM_DESKS: Record<string, { x: number; y: number }> = {
  "r-mkt": AREA_DESKS["area-mkt"]!,
  "r-dev": AREA_DESKS["area-dev"]!,
  "r-ops": AREA_DESKS["area-ops"]!,
  "r-fin": AREA_DESKS["area-fin"]!,
  "r-lab2": AREA_DESKS["area-lab"]!,
  "b-alpha-leader": AREA_DESKS["area-alpha-leader"]!,
  "b-beta-leader": AREA_DESKS["area-beta-leader"]!,
  "b-gamma-leader": AREA_DESKS["area-gamma-leader"]!,
};

export function hashOffset(id: string, span: number): { dx: number; dy: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return { dx: h % span, dy: Math.floor(h / span) % span };
}

/** Stable desk pixel for an agent (waAreaId → roomId → join fallback). */
export function deskPosition(
  agent: Pick<AgentRef, "id" | "roomId" | "waAreaId">,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  const byArea =
    agent.waAreaId != null && agent.waAreaId !== ""
      ? AREA_DESKS[agent.waAreaId]
      : undefined;
  const base = byArea ?? ROOM_DESKS[agent.roomId] ?? fallback;
  const { dx, dy } = hashOffset(agent.id, 64);
  return { x: base.x + dx, y: base.y + dy };
}
