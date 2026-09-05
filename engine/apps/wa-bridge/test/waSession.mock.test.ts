import { describe, expect, it } from "vitest";
import { joinWaSession } from "../src/waSession";
import { startMockWaServer } from "../src/mockWaServer";
import type { WaBridgeConfig } from "../src/types";

describe("joinWaSession against mock WA", () => {
  it("anonymLogin + JoinRoom delivers the agent name", async () => {
    const mock = await startMockWaServer();
    try {
      const cfg: WaBridgeConfig = {
        campusWsUrl: "ws://127.0.0.1:1",
        waPlayUrl: mock.playUrl,
        waRoomUrl: `${mock.playUrl}/~/campus/starter/map.wam`,
        characterTextureIds: ["male1"],
        presencePort: 0,
        joinPosition: { x: 320, y: 320 },
        reconnectBaseMs: 100,
        reconnectMaxMs: 500,
        routinesEnabled: false,
        routineIdleMs: 45_000,
        routineWorkMs: 90_000,
        queueHoldMs: 20_000,
      };

      const session = await joinWaSession(
        { id: "a-mia", name: "Mia", kind: "named", buildingId: "b1", roomId: "r1" },
        cfg,
      );

      try {
        await waitFor(() => mock.joins.length >= 1, 3000);
        expect(mock.joins[0]?.name).toBe("Mia");
        expect(mock.joins[0]?.roomId).toContain("campus/starter/map.wam");
      } finally {
        session.close();
      }
    } finally {
      await mock.close();
    }
  }, 15_000);
});

async function waitFor(pred: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("timeout waiting for condition");
    await new Promise((r) => setTimeout(r, 25));
  }
}
