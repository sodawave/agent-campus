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

  // Named agents with roles + org line.
  s.agent.instantiate({ id: "a-mia", name: "Mia", buildingId: "b-alpha", roomId: "r-mkt", rankKey: "lead", skillKey: "marketing" });
  s.agent.instantiate({ id: "a-ivan", name: "Ivan", buildingId: "b-alpha", roomId: "r-dev", rankKey: "ic", skillKey: "software-eng" });
  s.agent.assignSupervisor({ agentId: "a-ivan", supervisorId: "a-mia" });
  s.room.assignHead({ roomId: "r-mkt", agentId: "a-mia" });

  // Anonymous worker spawned by an ic agent.
  s.worker.spawn({ id: "w-1", actorId: "a-ivan", buildingId: "b-alpha", roomId: "r-dev" });

  // A task walking the test-gate up to review.
  s.task.assign({ id: "t-1", title: "Ship onboarding", assigneeId: "a-ivan", orderedById: "a-mia" });
  s.task.start({ taskId: "t-1" });
  s.task.submit({ taskId: "t-1" });

  // Execution plane: a host runs Mia.
  s.host.join({ id: "h-laptop", label: "laptop-ana" });
  s.runtime.start({ id: "rt-1", hostId: "h-laptop", agentId: "a-mia", workingDir: "/repo/alpha" });

  // SDD on the building + a library classification/doc.
  s.specKit.enable({ buildingId: "b-alpha" });
  s.specKit.advancePhase({ buildingId: "b-alpha" }); // -> specify
  s.library.addClassification({ id: "cl-eng", key: "eng", label: "Engineering", skillKeys: ["software-eng"] });
  s.library.addDocument({ id: "doc-1", title: "Style Guide", kind: "manual", classificationIds: ["cl-eng"] });
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
