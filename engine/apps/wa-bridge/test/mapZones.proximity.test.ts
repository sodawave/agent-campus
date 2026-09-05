import { describe, expect, it } from "vitest";
import {
  isForbiddenForRoutines,
  isJitsiZone,
  pickWanderTarget,
  toWanderZone,
  zoneAt,
  STARTER_ZONES,
} from "../src/mapZones";
import { createProximityState, proximityTick, type ProximityAgent } from "../src/proximity";

describe("mapZones", () => {
  it("identifies starter map named zones", () => {
    expect(zoneAt(192, 304)).toBe("start");
    expect(zoneAt(128, 160)).toBe("chill");
    expect(zoneAt(848, 240)).toBe("meeting");
    expect(zoneAt(464, 112)).toBe("clock");
    expect(zoneAt(400, 400)).toBe("desk");
  });

  it("marks chill/meeting/start as disabled for routines", () => {
    expect(isJitsiZone("chill")).toBe(true);
    expect(isJitsiZone("meeting")).toBe(true);
    expect(isForbiddenForRoutines("start")).toBe(true);
    expect(isForbiddenForRoutines("desk")).toBe(false);
    const blocked = STARTER_ZONES.filter((z) => z.disabledForRoutines);
    expect(blocked.map((z) => z.id).sort()).toEqual(["chill", "meeting", "start"]);
  });

  it("toWanderZone never returns jitsi or start", () => {
    expect(toWanderZone("chill")).toBe("desk");
    expect(toWanderZone("meeting")).toBe("desk");
    expect(toWanderZone("start")).toBe("desk");
    expect(toWanderZone("clock")).toBe("clock");
  });

  it("pickWanderTarget never chooses chill, meeting, or start", () => {
    const desk = { x: 300, y: 400 };
    for (let i = 0; i < 40; i++) {
      const t = pickWanderTarget(desk, desk, () => (i % 10) / 10);
      expect(t.zone).not.toBe("chill");
      expect(t.zone).not.toBe("meeting");
      expect(t.zone).not.toBe("start");
      expect(["desk", "hallway", "clock"]).toContain(t.zone);
      expect(isForbiddenForRoutines(zoneAt(t.x, t.y))).toBe(false);
    }
  });
});

describe("proximityTick", () => {
  const base = (partial: Partial<ProximityAgent> & Pick<ProximityAgent, "id" | "name">): ProximityAgent => ({
    x: 800,
    y: 200,
    social: "alone",
    ...partial,
  });

  it("emits greet when two agents enter proximity", () => {
    const state = createProximityState();
    const actions = proximityTick(
      [base({ id: "a", name: "Mia", x: 800, y: 200 }), base({ id: "b", name: "Ivan", x: 820, y: 200 })],
      state,
      { thresholdPx: 100, replyWindowMs: 10_000, nowMs: 1000 },
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]?.type).toBe("greet");
  });

  it("on reply within window, queues both via replyAndQueue", () => {
    const state = createProximityState();
    const agents = [
      base({ id: "a", name: "Mia", x: 800, y: 200 }),
      base({ id: "b", name: "Ivan", x: 820, y: 200 }),
    ];
    proximityTick(agents, state, { thresholdPx: 100, replyWindowMs: 10_000, nowMs: 1000 });
    agents[0]!.social = "greeted";
    const actions = proximityTick(agents, state, {
      thresholdPx: 100,
      replyWindowMs: 10_000,
      nowMs: 2000,
    });
    expect(actions.some((a) => a.type === "replyAndQueue")).toBe(true);
  });

  it("does not greet when far apart", () => {
    const state = createProximityState();
    const actions = proximityTick(
      [base({ id: "a", name: "Mia", x: 100, y: 100 }), base({ id: "b", name: "Ivan", x: 800, y: 400 })],
      state,
      { thresholdPx: 80, replyWindowMs: 10_000, nowMs: 1 },
    );
    expect(actions).toEqual([]);
  });
});
