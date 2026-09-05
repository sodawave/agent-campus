/**
 * CampusLink — a thin handle to the core: send commands + read the projection.
 * In production it is backed by a WebSocket CampusClient; tests use an in-memory
 * link so tool logic is validated without a network.
 */

import WebSocket from "ws";
import {
  CampusClient,
  type CampusCommand,
  type CommandResult,
  type Connection,
  type State,
} from "@agent-campus/engine";

export interface CampusLink {
  send(command: CampusCommand): Promise<CommandResult>;
  state(): State;
}

function wsConnection(ws: WebSocket): Connection {
  return {
    send: (data) => ws.send(data),
    onMessage: (cb) => ws.on("message", (raw) => cb(raw.toString())),
    onClose: (cb) => ws.on("close", cb),
    close: () => ws.close(),
  };
}

/** Connect to the core over WebSocket; resolves once the snapshot is projected. */
export function createWsCampusLink(url: string): Promise<CampusLink> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const client = new CampusClient(wsConnection(ws));
    let ready = false;
    const unsub = client.subscribe(() => {
      if (ready) return;
      ready = true;
      unsub();
      resolve({
        send: (command) => client.send(command),
        state: () => client.state(),
      });
    });
    ws.on("error", (err) => {
      if (!ready) reject(err);
    });
  });
}
