import { describe, expect, it, vi } from "vitest";
import { AgentWaBridge } from "../src/bridge";
import type { WaBridgeConfig } from "../src/types";
import * as waSession from "../src/waSession";

describe("AgentWaBridge.sync", () => {
  it("joins each named agent once and skips workers", async () => {
    const joined: string[] = [];
    vi.spyOn(waSession, "joinWaSession").mockImplementation(async (agent) => {
      joined.push(agent.id);
      return {
        agentId: agent.id,
        name: agent.name,
        desk: { x: 0, y: 0 },
        position: () => ({ x: 0, y: 0 }),
        zone: () => "desk" as const,
        social: () => "alone" as const,
        setSocial: () => undefined,
        moveTo: () => undefined,
        say: () => undefined,
        setQueued: () => undefined,
        close: () => undefined,
      };
    });

    const cfg: WaBridgeConfig = {
      campusWsUrl: "ws://unused",
      waPlayUrl: "http://unused",
      waRoomUrl: "http://unused/map",
      characterTextureIds: ["male1"],
      joinPosition: { x: 1, y: 1 },
      reconnectBaseMs: 10,
      reconnectMaxMs: 50,
      routinesEnabled: false,
      routineIdleMs: 45_000,
      routineWorkMs: 90_000,
      queueHoldMs: 20_000,
    };

    const bridge = new AgentWaBridge(cfg);
    bridge.sync([
      { id: "a-mia", name: "Mia", kind: "named", buildingId: "b1", roomId: "r1" },
      { id: "w-1", name: "worker", kind: "anonymous_worker", buildingId: "b1", roomId: "r1" },
      { id: "a-ivan", name: "Ivan", kind: "named", buildingId: "b1", roomId: "r1" },
    ]);

    await waitFor(() => joined.length === 2, 2000);
    expect(joined.sort()).toEqual(["a-ivan", "a-mia"]);

    // second sync must not re-join
    bridge.sync([
      { id: "a-mia", name: "Mia", kind: "named", buildingId: "b1", roomId: "r1" },
      { id: "a-ivan", name: "Ivan", kind: "named", buildingId: "b1", roomId: "r1" },
    ]);
    await sleep(50);
    expect(joined).toHaveLength(2);

    bridge.close();
    vi.restoreAllMocks();
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(pred: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("timeout");
    await sleep(20);
  }
}
