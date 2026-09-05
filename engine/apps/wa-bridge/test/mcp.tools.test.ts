import { describe, expect, it, vi } from "vitest";
import type { WaSession } from "../src/waSession";
import { WaMcpRegistry } from "../src/mcp/registry";
import { buildWaTools } from "../src/mcp/tools";
import type { WaBridgeConfig } from "../src/types";
import { startMockWaServer } from "../src/mockWaServer";
import { joinWaSession } from "../src/waSession";

function stubSession(id: string, name: string): WaSession {
  let pos = { x: 10, y: 20 };
  return {
    agentId: id,
    name,
    desk: { x: 10, y: 20 },
    position: () => ({ ...pos }),
    zone: () => "desk",
    social: () => "alone",
    setSocial() {},
    moveTo(x, y) {
      pos = { x, y };
    },
    say() {},
    setQueued() {},
    close: vi.fn(),
  };
}

const baseCfg: WaBridgeConfig = {
  campusWsUrl: "ws://127.0.0.1:1",
  waPlayUrl: "http://play.test",
  waRoomUrl: "http://play.test/~/campus/starter/map.wam",
  characterTextureIds: ["male1"],
  joinPosition: { x: 320, y: 320 },
  reconnectBaseMs: 100,
  reconnectMaxMs: 500,
  routinesEnabled: false,
  routineIdleMs: 45_000,
  routineWorkMs: 90_000,
  queueHoldMs: 20_000,
};

describe("WaMcpRegistry", () => {
  it("lists and replaces sessions", () => {
    const reg = new WaMcpRegistry();
    const a = stubSession("a1", "Ada");
    reg.set(a);
    expect(reg.list()).toEqual([{ id: "a1", name: "Ada", x: 10, y: 20, zone: "desk" }]);
    const b = stubSession("a1", "Ada2");
    reg.set(b);
    expect(a.close).toHaveBeenCalled();
    expect(reg.get("a1")?.name).toBe("Ada2");
    expect(reg.delete("a1")).toBe(true);
    expect(b.close).toHaveBeenCalled();
    expect(reg.get("a1")).toBeUndefined();
  });
});

describe("buildWaTools", () => {
  it("join/move/say/leave against mock WA", async () => {
    const mock = await startMockWaServer();
    try {
      const cfg: WaBridgeConfig = {
        ...baseCfg,
        waPlayUrl: mock.playUrl,
        waRoomUrl: `${mock.playUrl}/~/campus/starter/map.wam`,
      };
      const registry = new WaMcpRegistry();
      const tools = buildWaTools(registry, cfg, { join: joinWaSession });
      const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

      const joined = JSON.parse(await byName["wa_agent_join"]!.run({ id: "a-mia", name: "Mia" })) as {
        ok: boolean;
        id: string;
      };
      expect(joined.ok).toBe(true);
      await waitFor(() => mock.joins.length >= 1, 3000);
      expect(mock.joins[0]?.name).toBe("Mia");

      const moved = JSON.parse(
        await byName["wa_agent_move"]!.run({ id: "a-mia", x: 400, y: 410 }),
      ) as { ok: boolean; x: number; y: number };
      expect(moved).toMatchObject({ ok: true, x: 400, y: 410 });

      const said = JSON.parse(
        await byName["wa_agent_say"]!.run({ id: "a-mia", message: "hola" }),
      ) as { ok: boolean };
      expect(said.ok).toBe(true);

      const list = JSON.parse(await byName["wa_agents_list"]!.run({})) as {
        agents: Array<{ id: string }>;
      };
      expect(list.agents.map((a) => a.id)).toEqual(["a-mia"]);

      const left = JSON.parse(await byName["wa_agent_leave"]!.run({ id: "a-mia" })) as {
        ok: boolean;
      };
      expect(left.ok).toBe(true);
      expect(registry.list()).toEqual([]);
    } finally {
      await mock.close();
    }
  }, 15_000);

  it("wa_map_upload invokes upload script", async () => {
    const registry = new WaMcpRegistry();
    const exec = vi.fn().mockResolvedValue({
      stdout: "Room (inline editor): http://play/~/campus/starter/map.wam\n",
      stderr: "",
    });
    const tools = buildWaTools(registry, baseCfg, {
      uploadScript: "/tmp/fake-upload.sh",
      exec: exec as never,
    });
    const upload = tools.find((t) => t.name === "wa_map_upload")!;
    const out = JSON.parse(await upload.run({ directory: "campus" })) as {
      ok: boolean;
      roomHint: string;
    };
    expect(out.ok).toBe(true);
    expect(out.roomHint).toContain("campus/starter/map.wam");
    expect(exec).toHaveBeenCalledWith(
      "bash",
      ["/tmp/fake-upload.sh"],
      expect.objectContaining({
        env: expect.objectContaining({ MAP_STORAGE_DIRECTORY: "campus" }),
      }),
    );
  });
});

async function waitFor(pred: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("timeout waiting for condition");
    await new Promise((r) => setTimeout(r, 25));
  }
}
