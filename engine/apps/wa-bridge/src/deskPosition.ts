import type { AgentRef } from "./types";

/** Pixel bases on the WA starter map for seeded campus rooms. */
const ROOM_DESKS: Record<string, { x: number; y: number }> = {
  "r-mkt": { x: 288, y: 352 },
  "r-dev": { x: 480, y: 352 },
  "r-ops": { x: 288, y: 512 },
  "r-fin": { x: 480, y: 512 },
  "r-lab2": { x: 384, y: 640 },
  // Auto-created leader offices (buildingId-leader)
  "b-alpha-leader": { x: 256, y: 288 },
  "b-beta-leader": { x: 520, y: 288 },
  "b-gamma-leader": { x: 160, y: 480 },
};

export function hashOffset(id: string, span: number): { dx: number; dy: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return { dx: h % span, dy: Math.floor(h / span) % span };
}

/** Stable desk pixel for an agent (room base + id offset, or join fallback grid). */
export function deskPosition(
  agent: Pick<AgentRef, "id" | "roomId">,
  fallback: { x: number; y: number },
): { x: number; y: number } {
  const base = ROOM_DESKS[agent.roomId] ?? fallback;
  const { dx, dy } = hashOffset(agent.id, 64);
  return { x: base.x + dx, y: base.y + dy };
}
