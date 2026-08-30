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
  s.building.spawn({ id: "b-alpha", name: "Alpha HQ" });
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

  // Skin catalog (visual assets).
  s.skin.register({ id: "s-hq", kind: "building", key: "hq-office", name: "HQ Office", palette: { floor: "#1a1a2e", wall: "#16213e", header: "#0f3460", accent: "#e94560" }, size: { w: 10, h: 8 } });
  s.skin.register({ id: "s-room-office", kind: "room", key: "office", name: "Office Room", palette: { floor: "#313244", wall: "#26263a", header: "#424549", accent: "#7aa2f7" } });
  s.skin.register({ id: "s-room-lab", kind: "room", key: "lab", name: "Lab Room", palette: { floor: "#2d2a3a", wall: "#25242b", header: "#3c3a42", accent: "#f4d03f" } });
  s.skin.register({ id: "s-agent-staff", kind: "agent", key: "staff", name: "Staff", palette: { floor: "#64849b", wall: "#4a6376", header: "#8ba4bb", accent: "#b6e2a8" } });

  // Apply appearance to seed entities.
  s.building.setAppearance({ buildingId: "b-alpha", appearance: { skinKey: "hq-office", x: 2, y: 2, facing: "down" } });
  s.room.setAppearance({ roomId: "r-mkt", appearance: { skinKey: "office", x: 0, y: 0 } });
  s.room.setAppearance({ roomId: "r-dev", appearance: { skinKey: "lab", x: 0, y: 0 } });
  s.agent.setAppearance({ agentId: "a-mia", appearance: { skinKey: "staff", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "a-ivan", appearance: { skinKey: "staff", x: 0, y: 0 } });

  // A project in the building inventory + an agent assigned to it.
  s.project.create({ id: "p-onboarding", buildingId: "b-alpha", name: "Onboarding" });
  s.project.assign({ agentId: "a-ivan", projectId: "p-onboarding" });

  // A short chat thread with an agent.
  s.chat.send({ id: "chat-1", agentId: "a-mia", from: "user", text: "¿Cómo va el lanzamiento?" });
  s.chat.send({ id: "chat-2", agentId: "a-mia", from: "agent", text: "En marcha; reviso métricas hoy." });
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
