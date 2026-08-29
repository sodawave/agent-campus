/**
 * Campus WebSocket server — exposes the core over a real ws socket.
 *
 * Wraps {@link CampusServer} + {@link InMemoryCommsBus}: on connect it sends the
 * current event log (catch-up); it accepts `{ id, command }` messages, executes
 * them via the core, replies `{ type:"result", id, result }`, and broadcasts
 * every published `{ type:"event", event }` to all connected clients.
 *
 * Minimal adapter (constitution VIII): auth, Redis/Buzz fan-out and reconnection
 * are later layers. Everything crossing the socket is JSON.
 */

import { WebSocketServer, type WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import {
  CampusServer,
  InMemoryCommsBus,
  type CampusCommand,
  type CampusCore,
  type CampusEvent,
  type CommsChannel,
} from "@agent-campus/campus-engine";

export interface CampusWsServerHandle {
  port: number;
  campusServer: CampusServer;
  close(): Promise<void>;
}

const CAMPUS_CHANNEL: CommsChannel = { scope: "campus", campusId: "campus" };

export function createCampusWsServer(options: {
  core: CampusCore;
  port?: number;
}): Promise<CampusWsServerHandle> {
  const bus = new InMemoryCommsBus();
  const campusServer = new CampusServer(options.core, bus);
  const sockets = new Set<WebSocket>();

  const wss = new WebSocketServer({ port: options.port ?? 0 });

  const unsubscribe = bus.subscribe(CAMPUS_CHANNEL, (event: CampusEvent) => {
    const payload = JSON.stringify({ type: "event", event });
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) socket.send(payload);
    }
  });

  wss.on("connection", (socket) => {
    sockets.add(socket);
    // Catch-up: send the current event log so the client converges.
    socket.send(JSON.stringify({ type: "log", events: campusServer.log() }));

    socket.on("message", async (raw) => {
      let message: { id?: string; command?: CampusCommand };
      try {
        message = JSON.parse(String(raw)) as typeof message;
      } catch {
        socket.send(
          JSON.stringify({
            type: "result",
            id: null,
            result: { ok: false, reason: "invalid_json" },
          }),
        );
        return;
      }
      const result = await campusServer.submit(
        JSON.stringify(message.command ?? null),
      );
      socket.send(
        JSON.stringify({ type: "result", id: message.id ?? null, result }),
      );
    });

    socket.on("close", () => {
      sockets.delete(socket);
    });
  });

  return new Promise((resolve, reject) => {
    wss.on("error", reject);
    wss.on("listening", () => {
      const address = wss.address() as AddressInfo;
      resolve({
        port: address.port,
        campusServer,
        close: () =>
          new Promise<void>((res) => {
            unsubscribe();
            for (const socket of sockets) socket.terminate();
            wss.close(() => res());
          }),
      });
    });
  });
}
