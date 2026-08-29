import "./style.css";
import {
  CampusStore,
  sampleDataset,
  type AgentInstance,
  type CampusCommand,
  type CampusEvent,
  type RoomDef,
} from "@agent-campus/campus-engine";

const WS_URL = `ws://${location.hostname}:8787`;
const LAYOUT = sampleDataset.building; // shared building geometry

/** Read-only projection of the core, rebuilt from the event stream. */
const projection = new CampusStore();
let status: "connecting" | "open" | "closed" = "connecting";

type View = "campus" | "building";
const ui: { view: View; buildingId: string | null } = {
  view: "campus",
  buildingId: null,
};

const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="top">
    <span class="dot" id="dot"></span>
    <h1>Agent Campus — Representer</h1>
    <span class="crumb" id="crumb"></span>
    <span class="sub" id="sub"></span>
  </div>
  <div class="wrap">
    <div>
      <div class="panel"><div id="view"></div></div>
      <div class="panel">
        <h2>Controls — Commands to the core</h2>
        <div class="row" id="controls"></div>
      </div>
    </div>
    <div class="panel"><h2>Event stream</h2><div class="log" id="log"></div></div>
  </div>
`;

const dot = document.getElementById("dot")!;
const sub = document.getElementById("sub")!;
const crumb = document.getElementById("crumb")!;
const viewEl = document.getElementById("view")!;
const logEl = document.getElementById("log")!;
const controls = document.getElementById("controls")!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function colorFromString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return `hsl(${Math.abs(hash) % 360} 70% 62%)`;
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

// ---- transport ----
const ws = new WebSocket(WS_URL);
ws.onopen = () => ((status = "open"), render());
ws.onclose = () => ((status = "closed"), render());
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data) as
    | { type: "snapshot"; log: CampusEvent[] }
    | { type: "event"; event: CampusEvent }
    | { type: "result"; result: unknown };
  if (msg.type === "snapshot") {
    for (const e of msg.log) projection.dispatch(e);
    if (!ui.buildingId) ui.buildingId = projection.firstBuilding()?.id ?? null;
  } else if (msg.type === "event") {
    projection.dispatch(msg.event);
  }
  render();
};
function send(command: CampusCommand): void {
  ws.send(JSON.stringify({ id: crypto.randomUUID(), command }));
}

// ---- controls ----
const btnWorker = el("button", "btn", "Spawn worker (ic)");
btnWorker.onclick = () => {
  const ic = activeAgents().find((a) => a.rankKey === "ic" && a.kind === "named");
  if (ic) send({ type: "worker.spawn", actorId: ic.id, label: "Worker" });
};
const btnBuilding = el("button", "btn", "Add building 'Beta Labs'");
btnBuilding.onclick = () => send({ type: "building.spawn", name: "Beta Labs" });
controls.append(btnWorker, btnBuilding);

// ---- rendering ----
function activeBuildingId(): string | null {
  return ui.buildingId ?? projection.firstBuilding()?.id ?? null;
}
function activeAgents(): AgentInstance[] {
  const id = activeBuildingId();
  return id ? projection.agentsInBuilding(id) : [];
}

function render(): void {
  dot.className = `dot${status === "open" ? " on" : ""}`;
  sub.textContent = `core ${WS_URL} · ${status} · live: ${projection.liveAgents().length}`;

  renderCrumb();
  viewEl.replaceChildren();
  if (ui.view === "campus") renderCampus();
  else renderBuilding();

  logEl.replaceChildren();
  for (const e of [...projection.getEventLog()].slice(-16).reverse()) {
    const line = el("div");
    line.append(el("b", undefined, e.type));
    logEl.append(line);
  }
}

function renderCrumb(): void {
  crumb.replaceChildren();
  const campus = el("a", "crumb-link", "Campus");
  campus.onclick = () => ((ui.view = "campus"), render());
  crumb.append(campus);
  if (ui.view === "building") {
    const b = activeBuildingId() ? projection.getBuilding(activeBuildingId()!) : undefined;
    crumb.append(el("span", "crumb-sep", " / "), el("span", undefined, b?.name ?? "—"));
  }
}

function renderCampus(): void {
  const buildings = projection.getState().buildings;
  const grid = el("div", "cards");
  if (!buildings.length) grid.append(el("div", "empty", "Waiting for core…"));
  for (const b of buildings) {
    const agents = projection.agentsInBuilding(b.id);
    const live = agents.filter((a) => a.runtimeId != null).length;
    const card = el("div", "card");
    card.append(el("div", "card-h", b.name));
    if (b.context.product) card.append(el("div", "card-sub", b.context.product));
    card.append(
      el("div", "card-stats", `${agents.length} agentes · ${live} vivos · ${projection.workspacesOf(b.id).length} salas`),
    );
    const enter = el("button", "btn primary", "Entrar");
    enter.onclick = () => ((ui.buildingId = b.id), (ui.view = "building"), render());
    card.append(enter);
    grid.append(card);
  }
  viewEl.append(el("h2", undefined, "Campus — edificios activos"), grid);
}

const TILE = 22;
const PAD = 14;
function bounds(): { w: number; h: number } {
  let mx = 0, my = 0;
  for (const r of LAYOUT.rooms) {
    mx = Math.max(mx, r.rect.x + r.rect.w);
    my = Math.max(my, r.rect.y + r.rect.h);
  }
  return { w: mx * TILE + PAD * 2, h: my * TILE + PAD * 2 };
}
function roomPx(r: RoomDef) {
  return { x: PAD + r.rect.x * TILE, y: PAD + r.rect.y * TILE, w: r.rect.w * TILE, h: r.rect.h * TILE };
}
function hexToRgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function renderBuilding(): void {
  const id = activeBuildingId();
  if (!id) {
    viewEl.append(el("div", "empty", "Sin edificio."));
    return;
  }
  const size = bounds();
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.className = "map";
  viewEl.append(el("h2", undefined, `${projection.getBuilding(id)?.name ?? ""} — departamentos`));
  viewEl.append(canvas);

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, size.w, size.h);

  const workspaces = projection.workspacesOf(id);
  const labelOf = (roomId: string) =>
    workspaces.find((w) => w.roomId === roomId)?.name ?? "";

  for (const room of LAYOUT.rooms) {
    const px = roomPx(room);
    const tint = room.carpetTint ?? "#334155";
    ctx.fillStyle = hexToRgba(tint, room.role === "hallway" ? 0.1 : 0.22);
    ctx.fillRect(px.x, px.y, px.w, px.h);
    ctx.strokeStyle = hexToRgba(tint, 0.9);
    ctx.lineWidth = 2;
    ctx.strokeRect(px.x + 1, px.y + 1, px.w - 2, px.h - 2);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(labelOf(room.id) || room.role, px.x + 8, px.y + 7);
  }

  // place agents by their workspace's room
  const byRoom = new Map<string, AgentInstance[]>();
  for (const a of projection.agentsInBuilding(id)) {
    const ws = projection.getState().workspaces.find((w) => w.id === a.workspaceId);
    const roomId = ws?.roomId ?? "room-hall";
    (byRoom.get(roomId) ?? byRoom.set(roomId, []).get(roomId)!).push(a);
  }
  for (const [roomId, list] of byRoom) {
    const room = LAYOUT.rooms.find((r) => r.id === roomId);
    if (!room) continue;
    const px = roomPx(room);
    const perRow = Math.max(1, Math.floor((px.w - 24) / 34));
    list.forEach((a, i) => {
      const cx = px.x + 22 + (i % perRow) * 34;
      const cy = px.y + 40 + Math.floor(i / perRow) * 34;
      const worker = a.kind === "anonymous_worker";
      ctx.fillStyle = worker ? "#7ee787" : colorFromString(a.name);
      ctx.beginPath();
      ctx.roundRect(cx - 11, cy - 11, 22, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#06131b";
      ctx.font = "700 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(worker ? "•" : initials(a.name), cx, cy);
      ctx.fillStyle = "#c8d3e0";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(worker ? "worker" : a.name.split(" ")[0]!, cx, cy + 20);
      if (a.runtimeId != null) {
        ctx.fillStyle = "#2ecc71";
        ctx.strokeStyle = "#0a0d12";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx + 9, cy - 9, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  const back = el("button", "btn", "← Campus");
  back.onclick = () => ((ui.view = "campus"), render());
  viewEl.append(el("div", "row", ""));
  viewEl.lastElementChild!.append(back);
}

render();
