import { describe, expect, it } from "vitest";
import { deskPosition, hashOffset } from "../src/deskPosition";
import type { AgentRef } from "../src/types";

function agent(partial: Partial<AgentRef> & Pick<AgentRef, "id" | "name" | "roomId">): AgentRef {
  return {
    kind: "named",
    buildingId: "b1",
    ...partial,
  };
}

describe("deskPosition", () => {
  const fallback = { x: 320, y: 320 };

  it("is deterministic for the same agent", () => {
    const a = agent({ id: "a-mia", name: "Mia", roomId: "r-mkt" });
    expect(deskPosition(a, fallback)).toEqual(deskPosition(a, fallback));
  });

  it("places known rooms near their base and offsets by agent id", () => {
    const a = agent({ id: "a-mia", name: "Mia", roomId: "r-mkt" });
    const b = agent({ id: "a-other", name: "Other", roomId: "r-mkt" });
    const pa = deskPosition(a, fallback);
    const pb = deskPosition(b, fallback);
    expect(pa.x).toBeGreaterThan(200);
    expect(pa.y).toBeGreaterThan(200);
    expect(pa).not.toEqual(pb);
  });

  it("falls back to join grid when room is unknown", () => {
    const a = agent({ id: "a-x", name: "X", roomId: "r-unknown" });
    const p = deskPosition(a, fallback);
    expect(Math.abs(p.x - fallback.x)).toBeLessThanOrEqual(96);
    expect(Math.abs(p.y - fallback.y)).toBeLessThanOrEqual(96);
  });

  it("prefers waAreaId desk over roomId when both are set", () => {
    const a = agent({ id: "a-mia", name: "Mia", roomId: "r-unknown", waAreaId: "area-mkt" });
    const p = deskPosition(a, fallback);
    expect(p.x).toBeGreaterThan(280);
    expect(p.y).toBeGreaterThan(340);
  });

  it("hashOffset is stable and bounded", () => {
    const o = hashOffset("a-mia", 64);
    expect(o.dx).toBeGreaterThanOrEqual(0);
    expect(o.dx).toBeLessThan(64);
    expect(o.dy).toBeGreaterThanOrEqual(0);
    expect(o.dy).toBeLessThan(64);
    expect(hashOffset("a-mia", 64)).toEqual(o);
  });
});
