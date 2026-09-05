import { distance, zoneAt, type MapZoneId } from "./mapZones";

export type SocialPhase = "alone" | "greeted" | "queued";

export interface ProximityAgent {
  id: string;
  name: string;
  x: number;
  y: number;
  social: SocialPhase;
}

export type ProximityAction =
  | { type: "greet"; fromId: string; toId: string; text: string; zone: MapZoneId }
  | { type: "replyAndQueue"; fromId: string; toId: string; text: string; zone: MapZoneId };

export interface ProximityState {
  /** pairKey → who already greeted (first speaker id) */
  greetedBy: Map<string, string>;
  /** pairKey → epoch ms of first greet */
  greetedAt: Map<string, number>;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function createProximityState(): ProximityState {
  return { greetedBy: new Map(), greetedAt: new Map() };
}

/**
 * Detect greet / continue-conversation→queue when agents enter proximity.
 * Pure: does not mutate agent positions; updates `state` maps in place.
 */
export function proximityTick(
  agents: readonly ProximityAgent[],
  state: ProximityState,
  opts: { thresholdPx: number; replyWindowMs: number; nowMs: number },
): ProximityAction[] {
  const actions: ProximityAction[] = [];
  const near = new Set<string>();

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i]!;
      const b = agents[j]!;
      if (a.social === "queued" && b.social === "queued") continue;
      const d = distance(a.x, a.y, b.x, b.y);
      if (d > opts.thresholdPx) continue;

      const key = pairKey(a.id, b.id);
      near.add(key);
      const zone = zoneAt((a.x + b.x) / 2, (a.y + b.y) / 2);
      const first = state.greetedBy.get(key);

      if (!first) {
        // Prefer the agent who is not already queued to open.
        const speaker = a.social === "queued" ? b : a;
        const other = speaker.id === a.id ? b : a;
        state.greetedBy.set(key, speaker.id);
        state.greetedAt.set(key, opts.nowMs);
        actions.push({
          type: "greet",
          fromId: speaker.id,
          toId: other.id,
          text: zoneGreet(speaker.name, other.name, zone),
          zone,
        });
        continue;
      }

      const greetedAt = state.greetedAt.get(key) ?? 0;
      if (opts.nowMs - greetedAt > opts.replyWindowMs) continue;

      // Second speaker continues the conversation → both go QUEUED waiting for orders.
      const replyFrom = first === a.id ? b : a;
      const replyTo = first === a.id ? a : b;
      if (replyFrom.social === "queued") continue;

      actions.push({
        type: "replyAndQueue",
        fromId: replyFrom.id,
        toId: replyTo.id,
        text: zoneReply(replyFrom.name, replyTo.name, zone),
        zone,
      });
      // Clear so we don't spam replies; pair stays near while queued.
      state.greetedBy.delete(key);
      state.greetedAt.delete(key);
    }
  }

  // Forget greets when agents separate (allow re-greet later).
  for (const key of [...state.greetedBy.keys()]) {
    if (!near.has(key)) {
      state.greetedBy.delete(key);
      state.greetedAt.delete(key);
    }
  }

  return actions;
}

function zoneGreet(from: string, to: string, zone: MapZoneId): string {
  switch (zone) {
    case "meeting":
      return `¡Hola ${to}! ¿Empezamos la reunión?`;
    case "chill":
      return `¡Hey ${to}! ¿Todo bien?`;
    case "start":
      return `¡Bienvenido/a ${to}!`;
    case "clock":
      return `${to}, ¿vamos con tiempo?`;
    default:
      return `¡Hola, ${to}! Soy ${from}.`;
  }
}

function zoneReply(_from: string, to: string, zone: MapZoneId): string {
  switch (zone) {
    case "meeting":
      return `Sí, ${to}. Quedo a la espera de órdenes.`;
    case "chill":
      return `Todo bien, ${to}. Dime qué necesitas.`;
    default:
      return `Hola ${to}. Quedo QUEUED esperando órdenes.`;
  }
}
