/**
 * Headless Campus core server (no screen).
 *
 * Runs the authoritative {@link CampusCore} and serves it over WebSocket:
 * on connect it sends a snapshot (state + event log); it accepts
 * `{ id, command }` messages, executes them through the core, replies
 * `{ type:"result", id, result }`, and broadcasts every `{ type:"event", event }`
 * to all clients. The core is the authority; clients only project.
 */

import { WebSocketServer, type WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import {
  type CampusCommand,
  type CampusCore,
  type CommandResult,
} from "@agent-campus/campus-engine";

export interface CampusServerHandle {
  port: number;
  core: CampusCore;
  close(): Promise<void>;
}

export function startCampusServer(
  core: CampusCore,
  port = 0,
  onLog: (message: string) => void = () => {},
): Promise<CampusServerHandle> {
  const wss = new WebSocketServer({ port });
  const sockets = new Set<WebSocket>();

  const broadcast = (payload: unknown): void => {
    const data = JSON.stringify(payload);
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) socket.send(data);
    }
  };

  const unsubscribe = core.subscribe((_state, event) => {
    if (event) {
      broadcast({ type: "event", event });
      onLog(`event ${event.type}`);
    }
  });

  wss.on("connection", (socket) => {
    sockets.add(socket);
    socket.send(
      JSON.stringify({ type: "snapshot", state: core.state(), log: core.eventLog() }),
    );
    onLog("client connected");

    socket.on("message", (raw) => {
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
      let result: CommandResult | undefined = message.command
        ? core.execute(message.command)
        : undefined;
      if (!result) result = { ok: false, reason: "unknown_command" };
      onLog(
        `command ${message.command?.type ?? "?"} -> ${
          result.ok ? "ok" : "reject:" + result.reason
        }`,
      );
      socket.send(
        JSON.stringify({ type: "result", id: message.id ?? null, result }),
      );
    });

    socket.on("close", () => sockets.delete(socket));
  });

  return new Promise((resolve, reject) => {
    wss.on("error", reject);
    wss.on("listening", () => {
      resolve({
        port: (wss.address() as AddressInfo).port,
        core,
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
