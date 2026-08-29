/**
 * Campus WebSocket client — a projection-only remote consumer.
 *
 * Sends `{ id, command }` over ws and resolves `send()` when the matching
 * `result` arrives; applies the `log` (catch-up) and each `event` to a local
 * `CampusStore` via the idempotent `reduce`. Holds no business rules.
 */

import { WebSocket } from "ws";
import {
  CampusStore,
  type CampusCommand,
  type CampusEvent,
  type CampusState,
} from "@agent-campus/campus-engine";

export type CommandResult =
  | { ok: true; events: CampusEvent[] }
  | { ok: false; reason: string };

export interface CampusWsClientHandle {
  send(command: CampusCommand): Promise<CommandResult>;
  state(): CampusState;
  close(): Promise<void>;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `cmd-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function connectCampusWsClient(
  url: string,
): Promise<CampusWsClientHandle> {
  const socket = new WebSocket(url);
  const projection = new CampusStore();
  const pending = new Map<string, (result: CommandResult) => void>();

  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw)) as
      | { type: "log"; events: CampusEvent[] }
      | { type: "event"; event: CampusEvent }
      | { type: "result"; id: string | null; result: CommandResult };

    switch (message.type) {
      case "log":
        for (const event of message.events) projection.dispatch(event);
        break;
      case "event":
        projection.dispatch(message.event);
        break;
      case "result": {
        if (message.id) {
          const resolve = pending.get(message.id);
          if (resolve) {
            pending.delete(message.id);
            resolve(message.result);
          }
        }
        break;
      }
    }
  });

  const handle: CampusWsClientHandle = {
    send(command) {
      const id = nextId();
      return new Promise<CommandResult>((resolve) => {
        pending.set(id, resolve);
        socket.send(JSON.stringify({ id, command }));
      });
    },
    state() {
      return projection.getState();
    },
    close() {
      return new Promise<void>((resolve) => {
        socket.on("close", () => resolve());
        socket.close();
      });
    },
  };

  return new Promise((resolve, reject) => {
    socket.on("open", () => resolve(handle));
    socket.on("error", reject);
  });
}
