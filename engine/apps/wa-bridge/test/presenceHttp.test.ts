import { describe, expect, it } from "vitest";
import { AgentWaBridge } from "../src/bridge";
import { startPresenceHttp } from "../src/presenceHttp";
import type { WaBridgeConfig } from "../src/types";

function cfg(port: number): WaBridgeConfig {
  return {
    campusWsUrl: "ws://127.0.0.1:9",
    waPlayUrl: "http://play.workadventure.localhost",
    waRoomUrl: "http://play.workadventure.localhost/~/x",
    characterTextureIds: ["male1"],
    joinPosition: { x: 0, y: 0 },
    reconnectBaseMs: 10,
    reconnectMaxMs: 100,
    routinesEnabled: false,
    routineIdleMs: 1,
    routineWorkMs: 1,
    queueHoldMs: 1,
    presencePort: port,
  };
}

describe("presenceHttp", () => {
  it("serves GET /presence as JSON", async () => {
    const bridge = new AgentWaBridge(cfg(0));
    const http = await startPresenceHttp(bridge, 0);
    expect(http.port).toBe(0);
    await http.close();

    const live = await startPresenceHttp(bridge, 18790);
    try {
      const res = await fetch(`http://127.0.0.1:${live.port}/presence`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; agents: unknown[] };
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.agents)).toBe(true);
    } finally {
      await live.close();
      bridge.close();
    }
  });
});
