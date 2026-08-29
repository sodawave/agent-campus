/**
 * Headless core service (execution/control host). Wraps a CampusServer and
 * exposes it over WebSocket. Clients connect, receive a snapshot, send commands
 * and receive broadcast events. No UI here — this is the authoritative core.
 */

import { WebSocketServer, type WebSocket } from "ws";
import {
  CampusServer,
  type Connection,
} from "@agent-campus/campus-engine";

const PORT = Number(process.env.PORT ?? 8787);

/** Adapt a `ws` socket to the engine's transport-agnostic Connection. */
function wsConnection(ws: WebSocket): Connection {
  return {
    send: (data) => ws.send(data),
    onMessage: (cb) => ws.on("message", (raw) => cb(raw.toString())),
    onClose: (cb) => ws.on("close", cb),
    close: () => ws.close(),
  };
}

function seed(server: CampusServer): void {
  const s = server.store;
  s.campus.load({ id: "campus-demo", name: "Demo Co" });
  s.building.spawn({ id: "b-alpha", name: "Project Alpha" });
  s.room.spawn({ id: "r-mkt", buildingId: "b-alpha", key: "marketing" });
  s.room.spawn({ id: "r-dev", buildingId: "b-alpha", key: "engineering" });
  s.agent.instantiate({ id: "a-mia", name: "Mia", buildingId: "b-alpha", roomId: "r-mkt" });
  s.agent.instantiate({ id: "a-ivan", name: "Ivan", buildingId: "b-alpha", roomId: "r-dev" });
}

const server = new CampusServer();
seed(server);

const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

wss.on("connection", (ws) => {
  server.handle(wsConnection(ws));
  console.log(`[core] client connected — log has ${server.log().length} events`);
});

wss.on("listening", () => {
  console.log(`[core] Campus core listening on ws://0.0.0.0:${PORT}`);
  console.log(`[core] seeded: campus=${server.state().campus?.name}, buildings=${server.state().buildings.length}, rooms=${server.state().rooms.length}, agents=${server.state().agents.length}`);
});
