/**
 * Headless core service (execution/control host). Wraps a CampusServer and
 * exposes it over WebSocket. Clients connect, receive a snapshot, send commands
 * and receive broadcast events. No UI here — this is the authoritative core.
 */

import { WebSocketServer, type WebSocket } from "ws";
import {
  CampusServer,
  type Connection,
} from "@agent-campus/engine";

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
  const play = (process.env.WA_PLAY_URL ?? "http://play.workadventure.localhost").replace(/\/$/, "");
  // Shared starter map so one browser tab shows the full demo fleet.
  // Per-building maps: set WA_SEED_MAP_MODE=per-building (uploads under ~/b-*/).
  const perBuilding = (process.env.WA_SEED_MAP_MODE ?? "shared").trim() === "per-building";
  const sharedMap = `${play}/~/campus/starter/map.wam`;
  const mapFor = (buildingId: string) =>
    perBuilding ? `${play}/~/${buildingId}/starter/map.wam` : sharedMap;

  s.campus.load({ id: "campus-demo", name: "Demo Co" });
  s.building.spawn({
    id: "b-alpha",
    name: "Alpha HQ",
    waRoomUrl: mapFor("b-alpha"),
    leaderName: "Aria",
  });
  s.room.spawn({ id: "r-mkt", buildingId: "b-alpha", key: "marketing" });
  s.room.spawn({ id: "r-dev", buildingId: "b-alpha", key: "engineering" });

  // Named agents with roles + org line.
  s.agent.instantiate({ id: "a-mia", name: "Mia", buildingId: "b-alpha", roomId: "r-mkt", rankKey: "lead", skillKey: "marketing" });
  s.agent.instantiate({ id: "a-ivan", name: "Ivan", buildingId: "b-alpha", roomId: "r-dev", rankKey: "ic", skillKey: "software-eng" });
  s.agent.assignSupervisor({ agentId: "a-ivan", supervisorId: "a-mia" });
  s.room.assignHead({ roomId: "r-mkt", agentId: "a-mia" });

  // Second building: a tower with its own crew.
  s.building.spawn({
    id: "b-beta",
    name: "Beta Tower",
    waRoomUrl: mapFor("b-beta"),
    leaderName: "Bruno",
  });
  s.room.spawn({ id: "r-ops", buildingId: "b-beta", key: "operations" });
  s.room.spawn({ id: "r-fin", buildingId: "b-beta", key: "finance" });
  s.agent.instantiate({ id: "a-joy", name: "Joy", buildingId: "b-beta", roomId: "r-ops", rankKey: "lead", skillKey: "operations" });
  s.agent.instantiate({ id: "a-kev", name: "Kevin", buildingId: "b-beta", roomId: "r-fin", rankKey: "ic", skillKey: "finance" });
  s.room.assignHead({ roomId: "r-ops", agentId: "a-joy" });

  // Third building: a small studio.
  s.building.spawn({
    id: "b-gamma",
    name: "Gamma Studio",
    waRoomUrl: mapFor("b-gamma"),
    leaderName: "Cora",
  });
  s.room.spawn({ id: "r-lab2", buildingId: "b-gamma", key: "research" });
  s.agent.instantiate({ id: "a-luz", name: "Luz", buildingId: "b-gamma", roomId: "r-lab2", rankKey: "lead", skillKey: "research" });
  s.room.assignHead({ roomId: "r-lab2", agentId: "a-luz" });

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

  // Skin catalog (visual assets). Clay palettes: {floor, wall, header, accent}.
  s.skin.register({ id: "s-hq", kind: "building", key: "hq-office", name: "HQ Office", palette: { floor: "#e6d3b8", wall: "#c9a97c", header: "#f4e3c6", accent: "#a67b4f" }, size: { w: 10, h: 8 } });
  s.skin.register({ id: "s-building-tower", kind: "building", key: "tower", name: "Beta Tower", palette: { floor: "#e8dce8", wall: "#b9a7ce", header: "#efe3f2", accent: "#8e7ba8" }, size: { w: 6, h: 6 } });
  s.skin.register({ id: "s-building-garden", kind: "building", key: "studio", name: "Gamma Studio", palette: { floor: "#e4edda", wall: "#a9c79a", header: "#e6f0dc", accent: "#6f9b66" }, size: { w: 8, h: 6 } });
  s.skin.register({ id: "s-room-office", kind: "room", key: "office", name: "Office Room", palette: { floor: "#eadfcb", wall: "#aec6d8", header: "#e2eef4", accent: "#7e9cb4" } });
  s.skin.register({ id: "s-room-lab", kind: "room", key: "lab", name: "Lab Room", palette: { floor: "#ede0d6", wall: "#d8a8bc", header: "#f5e7ec", accent: "#a86e82" } });
  s.skin.register({ id: "s-agent-staff", kind: "agent", key: "staff", name: "Staff", palette: { floor: "#efe5ce", wall: "#c9c99b", header: "#f2edc9", accent: "#8f9b6c" } });
  // WA WOKA ids (bridge uses appearance.skinKey when it matches maleN/femaleN).
  for (const key of [
    "female1",
    "female2",
    "female3",
    "female4",
    "male1",
    "male2",
    "male3",
    "male4",
  ] as const) {
    s.skin.register({
      id: `s-woka-${key}`,
      kind: "agent",
      key,
      name: key,
      palette: { floor: "#efe5ce", wall: "#c9c99b", header: "#f2edc9", accent: "#8f9b6c" },
    });
  }

  // Apply appearance to seed entities (coords in world tiles for the campus diorama).
  s.building.setAppearance({ buildingId: "b-alpha", appearance: { skinKey: "hq-office", x: 2, y: 2, facing: "down" } });
  s.building.setAppearance({ buildingId: "b-beta", appearance: { skinKey: "tower", x: 9, y: 2, facing: "down" } });
  s.building.setAppearance({ buildingId: "b-gamma", appearance: { skinKey: "studio", x: 2, y: 9, facing: "down" } });
  s.room.setAppearance({ roomId: "r-mkt", appearance: { skinKey: "office", x: 0, y: 0 } });
  s.room.setAppearance({ roomId: "r-dev", appearance: { skinKey: "lab", x: 2, y: 0 } });
  s.room.setAppearance({ roomId: "r-ops", appearance: { skinKey: "office", x: 0, y: 0 } });
  s.room.setAppearance({ roomId: "r-fin", appearance: { skinKey: "lab", x: 2, y: 0 } });
  s.room.setAppearance({ roomId: "r-lab2", appearance: { skinKey: "lab", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "a-mia", appearance: { skinKey: "female1", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "a-ivan", appearance: { skinKey: "male1", x: 2, y: 2 } });
  s.agent.setAppearance({ agentId: "a-joy", appearance: { skinKey: "female2", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "a-kev", appearance: { skinKey: "male2", x: 2, y: 2 } });
  s.agent.setAppearance({ agentId: "a-luz", appearance: { skinKey: "female3", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "b-alpha-leader-agent", appearance: { skinKey: "female4", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "b-beta-leader-agent", appearance: { skinKey: "male3", x: 1, y: 1 } });
  s.agent.setAppearance({ agentId: "b-gamma-leader-agent", appearance: { skinKey: "male4", x: 1, y: 1 } });

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
