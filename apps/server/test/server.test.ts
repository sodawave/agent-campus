import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { startCampusServer, type CampusServerHandle } from "../src/server";
import { createSeededCore } from "../src/seed";

let server: CampusServerHandle | undefined;

afterEach(async () => {
  if (server) await server.close();
  server = undefined;
});

interface Client {
  ws: WebSocket;
  waitFor: <T>(match: (m: any) => boolean, timeoutMs?: number) => Promise<T>;
}

/** Connect and buffer all messages from the start (no open/message race). */
function connect(port: number): Promise<Client> {
  const ws = new WebSocket(`ws://localhost:${port}`);
  const buffer: any[] = [];
  const waiters = new Set<() => void>();
  ws.on("message", (raw) => {
    buffer.push(JSON.parse(String(raw)));
    for (const w of waiters) w();
  });
  const waitFor = <T,>(match: (m: any) => boolean, timeoutMs = 4000): Promise<T> =>
    new Promise((resolve, reject) => {
      const check = () => {
        const found = buffer.find(match);
        if (found) {
          resolve(found as T);
          return true;
        }
        return false;
      };
      if (check()) return;
      const timer = setTimeout(() => reject(new Error("waitFor timeout")), timeoutMs);
      const w = () => {
        if (check()) {
          clearTimeout(timer);
          waiters.delete(w);
        }
      };
      waiters.add(w);
    });
  return new Promise((resolve, reject) => {
    ws.on("open", () => resolve({ ws, waitFor }));
    ws.on("error", reject);
  });
}

describe("Headless campus core server", () => {
  it("serves a snapshot on connect and applies a command → event", async () => {
    server = await startCampusServer(createSeededCore(), 0);
    const client = await connect(server.port);

    const snapshot = await client.waitFor<{ state: any }>((m) => m.type === "snapshot");
    expect(snapshot.state.buildings.length).toBeGreaterThan(0);
    expect(snapshot.state.agents.length).toBeGreaterThan(0);

    client.ws.send(
      JSON.stringify({ id: "c1", command: { type: "building.spawn", name: "Beta" } }),
    );

    const event = await client.waitFor<{ event: any }>(
      (m) => m.type === "event" && m.event.type === "building.spawned",
    );
    const result = await client.waitFor<{ result: any }>((m) => m.type === "result");
    expect(event.event.project.name).toBe("Beta");
    expect(result.result.ok).toBe(true);

    client.ws.close();
  });

  it("rejects an invalid command without changing state", async () => {
    server = await startCampusServer(createSeededCore(), 0);
    const client = await connect(server.port);
    await client.waitFor((m) => m.type === "snapshot");

    client.ws.send(JSON.stringify({ id: "c2", command: { type: "bogus" } }));
    const result = await client.waitFor<{ result: any }>((m) => m.type === "result");
    expect(result.result.ok).toBe(false);

    client.ws.close();
  });
});
