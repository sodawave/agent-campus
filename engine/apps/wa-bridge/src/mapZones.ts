/** Named zones of the WorkAdventure starter map (pixel AABB). */
export type MapZoneId = "start" | "chill" | "meeting" | "clock" | "desk" | "hallway";

/**
 * Zones agents may wander into.
 * Excluded: jitsiChillzone, jitsiMeetingRoom (+ liveZone), and start (human spawn — never crowd the player).
 */
export type WanderZoneId = "clock" | "desk" | "hallway";

export interface MapZone {
  id: MapZoneId;
  label: string;
  /** Inclusive min / exclusive max in world pixels. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** If true, routines must not target this zone. */
  disabledForRoutines?: boolean;
}

/**
 * Zones from `maps/starter/map.json`:
 * - jitsiChillzone, jitsiMeetingRoom (+ liveZone object) — Jitsi / interactive, no wander
 * - start — human entry spawn, no wander (avoids shoving the player)
 */
export const STARTER_ZONES: readonly MapZone[] = [
  { id: "start", label: "Entrada (spawn humano)", x0: 160, y0: 256, x1: 224, y1: 352, disabledForRoutines: true },
  { id: "chill", label: "jitsiChillzone", x0: 32, y0: 96, x1: 224, y1: 224, disabledForRoutines: true },
  // jitsiMeetingRoom tiles 736,96–960,448 + liveZone object y from 32
  { id: "meeting", label: "jitsiMeetingRoom / liveZone", x0: 736, y0: 32, x1: 960, y1: 448, disabledForRoutines: true },
  { id: "clock", label: "Reloj", x0: 448, y0: 96, x1: 480, y1: 128 },
];

export const WANDER_ZONE_IDS: readonly WanderZoneId[] = ["desk", "hallway", "clock"];

/** Preferred hangout point inside each zone (anchors for detection / escape only for disabled). */
export const ZONE_ANCHORS: Record<MapZoneId, { x: number; y: number }> = {
  start: { x: 192, y: 304 },
  chill: { x: 128, y: 160 },
  meeting: { x: 848, y: 240 },
  clock: { x: 464, y: 112 },
  desk: { x: 400, y: 400 },
  hallway: { x: 400, y: 240 },
};

export function isJitsiZone(zone: MapZoneId): boolean {
  return zone === "chill" || zone === "meeting";
}

/** Zones routines must not linger in or target (Jitsi + human spawn). */
export function isForbiddenForRoutines(zone: MapZoneId): boolean {
  return zone === "chill" || zone === "meeting" || zone === "start";
}

export function zoneAt(x: number, y: number): MapZoneId {
  for (const z of STARTER_ZONES) {
    if (x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1) return z.id;
  }
  if (x >= 256 && x < 700 && y >= 300 && y < 700) return "desk";
  return "hallway";
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

/** Map any zone to a wander-safe zone (never jitsi / start). */
export function toWanderZone(zone: MapZoneId): WanderZoneId {
  if (isForbiddenForRoutines(zone)) return "desk";
  if (zone === "clock" || zone === "desk" || zone === "hallway") return zone;
  return "hallway";
}

/** Pick next idle destination among allowed zones (never chill/meeting/start). */
export function pickWanderTarget(
  desk: { x: number; y: number },
  now: { x: number; y: number },
  rng: () => number = Math.random,
): { x: number; y: number; zone: WanderZoneId } {
  const current = toWanderZone(zoneAt(now.x, now.y));
  let zone: WanderZoneId;
  if (current === "desk" && rng() < 0.65) {
    const others: WanderZoneId[] = ["hallway", "clock"];
    zone = others[Math.floor(rng() * others.length)] ?? "hallway";
  } else if (rng() < 0.4) {
    zone = "desk";
  } else {
    const others = WANDER_ZONE_IDS.filter((z) => z !== current);
    zone = others[Math.floor(rng() * others.length)] ?? "hallway";
  }
  const point = wanderPoint(zone, desk, rng);
  // Hard guard: never emit a point that lands in a forbidden AABB.
  if (isForbiddenForRoutines(zoneAt(point.x, point.y))) {
    return { x: desk.x, y: desk.y, zone: "desk" };
  }
  return { ...point, zone };
}

function wanderPoint(
  zone: WanderZoneId,
  desk: { x: number; y: number },
  rng: () => number,
): { x: number; y: number } {
  switch (zone) {
    case "clock":
      return { x: ZONE_ANCHORS.clock.x, y: ZONE_ANCHORS.clock.y };
    case "desk":
      return { x: desk.x + Math.floor(rng() * 48) - 8, y: desk.y + Math.floor(rng() * 24) };
    default:
      // Keep hallway targets in the central corridor (away from chill left & meeting right).
      return {
        x: 280 + Math.floor(rng() * 200),
        y: 220 + Math.floor(rng() * 80),
      };
  }
}

/** @deprecated use pickWanderTarget */
export function zoneWanderTarget(
  zone: MapZoneId,
  desk: { x: number; y: number },
  _now: { x: number; y: number },
): { x: number; y: number } {
  const safe = toWanderZone(zone);
  return wanderPoint(safe, desk, () => 0.5);
}
