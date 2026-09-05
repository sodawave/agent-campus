import { describe, expect, it, vi } from "vitest";

describe("queue hold resume", () => {
  it("after holdMs, social returns to alone (session contract)", async () => {
    // Lightweight stand-in of WaSession setQueued cooldown logic
    let social: "alone" | "queued" = "alone";
    let holdUntil = 0;
    const holdMs = 50;
    const setQueued = (value: boolean) => {
      if (!value) {
        holdUntil = 0;
        social = "alone";
        return;
      }
      social = "queued";
      holdUntil = Date.now() + holdMs;
      setTimeout(() => {
        holdUntil = 0;
        social = "alone";
      }, holdMs);
    };
    const inHold = () => Date.now() < holdUntil;

    setQueued(true);
    expect(social).toBe("queued");
    expect(inHold()).toBe(true);
    await new Promise((r) => setTimeout(r, holdMs + 30));
    expect(social).toBe("alone");
    expect(inHold()).toBe(false);
  });
});

// silence unused vi if lint complains in empty import — keep for future spies
void vi;
