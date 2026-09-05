import { describe, expect, it } from "vitest";
import { nextWorkPhase, workChatText, type WorkPhase } from "../src/workRoutine";

describe("workRoutine templates", () => {
  it("rotates idle → working → break → idle", () => {
    let p: WorkPhase = "idle";
    p = nextWorkPhase(p);
    expect(p).toBe("working");
    p = nextWorkPhase(p);
    expect(p).toBe("break");
    p = nextWorkPhase(p);
    expect(p).toBe("idle");
  });

  it("stays queued once queued", () => {
    expect(nextWorkPhase("queued")).toBe("queued");
  });

  it("uses skill-specific copy when known", () => {
    const text = workChatText("Mia", "software-eng", "working");
    expect(text.toLowerCase()).toMatch(/code|ship|eng|pr|test/);
    expect(text).toContain("Mia");
  });

  it("falls back for unknown skill", () => {
    const text = workChatText("Luz", "alchemy", "idle");
    expect(text).toContain("Luz");
    expect(text.length).toBeGreaterThan(5);
  });

  it("queued text mentions waiting for orders", () => {
    expect(workChatText("Joy", "operations", "queued")).toMatch(/QUEUED|órdenes/i);
  });
});
